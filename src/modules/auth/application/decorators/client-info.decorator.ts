import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Parameter decorator extracting client metadata (IP address and User-Agent)
 * from the incoming HTTP request.
 */
export const ClientMetadata = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfo => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers ? (req.headers['user-agent'] as string | undefined) : undefined;

    return {
      ipAddress,
      userAgent,
    };
  },
);
