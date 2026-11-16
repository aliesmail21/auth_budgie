import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfigService } from '../../../config/app-config.service';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly appConfig: AppConfigService) {
    const transport = this.appConfig.emailTransport;
    const smtp = this.appConfig.smtpConfig;

    if (transport === 'smtp' && smtp?.host) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port ?? 1025,
        secure: smtp.port === 465,
        auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
      this.logger.log(`Initialized SMTP email transport at ${smtp.host}:${smtp.port ?? 1025}`);
    } else {
      // Stream transport for local development / testing (local mail catcher or stream)
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      });
      this.logger.log(`Initialized local stream email transport (transport mode: ${transport})`);
    }
  }

  /**
   * Sends an account verification email containing the verification link/token.
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const baseUrl = this.appConfig.emailAppUrl.replace(/\/+$/, '');
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    const subject = 'Verify your Budgie account';
    const text = `Welcome to Budgie! Please verify your email by opening the following link in your browser: ${verificationUrl}\n\nThis link will expire in 24 hours.`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to Budgie!</h2>
        <p>Thank you for signing up. Please verify your email address to activate all features of your account:</p>
        <p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #2E7D32; color: #fff; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p>This verification link will expire in 24 hours.</p>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Sends a password reset email containing the secure reset link.
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = this.appConfig.emailAppUrl.replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
    const subject = 'Reset your Budgie account password';
    const text = `We received a request to reset your Budgie password. Use the following link to choose a new password: ${resetUrl}\n\nIf you did not request this, you can safely ignore this email. This link will expire in 1 hour.`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your Budgie account password. Click the button below to proceed:</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #1976D2; color: #fff; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>If you did not make this request, you can safely ignore this email. This link expires in 1 hour.</p>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }

  private async sendMail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.appConfig.emailFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      // Security: never log the raw token or URL
      this.logger.log(`Dispatched email '${options.subject}' to recipient.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to dispatch email to recipient: ${message}`);
      // Do not throw to avoid breaking database transactions if email service is temporarily degraded,
      // but log for operational alerting.
    }
  }
}
