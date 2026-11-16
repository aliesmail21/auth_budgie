import { ValueObject } from './value-object';
import { AppError } from '../errors/app-error';

export interface MoneyProps {
  amountInCents: number;
  currency: string;
}

/**
 * Domain Value Object representing a monetary amount in a specific currency.
 * Stores amounts in integer minor units (cents) to guarantee arithmetic precision
 * and eliminate floating-point rounding errors.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static fromCents(amountInCents: number, currency: string): Money {
    if (!Number.isInteger(amountInCents)) {
      throw AppError.badRequest('Monetary amount in cents must be an integer.');
    }

    const sanitizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(sanitizedCurrency)) {
      throw AppError.badRequest(
        `Invalid ISO 4217 currency code: '${currency}'. Expected 3 letters.`,
      );
    }

    return new Money({
      amountInCents,
      currency: sanitizedCurrency,
    });
  }

  static fromDecimal(amount: number, currency: string): Money {
    if (!Number.isFinite(amount)) {
      throw AppError.badRequest('Monetary decimal amount must be a finite number.');
    }
    const cents = Math.round(amount * 100);
    return Money.fromCents(cents, currency);
  }

  static zero(currency: string): Money {
    return Money.fromCents(0, currency);
  }

  get amountInCents(): number {
    return this.props.amountInCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  toDecimal(): number {
    return this.props.amountInCents / 100;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.props.amountInCents + other.amountInCents, this.props.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.props.amountInCents - other.amountInCents, this.props.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor)) {
      throw AppError.badRequest('Multiplication factor must be a finite number.');
    }
    return Money.fromCents(Math.round(this.props.amountInCents * factor), this.props.currency);
  }

  /**
   * Split a monetary amount across proportions (ratios) without losing or creating a single cent.
   */
  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      return [];
    }
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    if (totalRatio <= 0) {
      throw AppError.badRequest('Total allocation ratio must be strictly positive.');
    }

    let remainder = this.props.amountInCents;
    const results: Money[] = [];

    for (const ratio of ratios) {
      const share = Math.floor((this.props.amountInCents * ratio) / totalRatio);
      results.push(Money.fromCents(share, this.props.currency));
      remainder -= share;
    }

    // Distribute remainder cent-by-cent to avoid rounding leakage
    for (let i = 0; remainder > 0; i = (i + 1) % results.length) {
      const current = results[i];
      if (current) {
        results[i] = Money.fromCents(current.amountInCents + 1, this.props.currency);
        remainder--;
      }
    }

    return results;
  }

  isZero(): boolean {
    return this.props.amountInCents === 0;
  }

  isPositive(): boolean {
    return this.props.amountInCents > 0;
  }

  isNegative(): boolean {
    return this.props.amountInCents < 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amountInCents > other.amountInCents;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amountInCents < other.amountInCents;
  }

  format(): string {
    const decimalStr = (this.props.amountInCents / 100).toFixed(2);
    return `${this.props.currency} ${decimalStr}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.currency) {
      throw AppError.badRequest(
        `Currency mismatch: cannot operate on '${this.props.currency}' and '${other.currency}'.`,
      );
    }
  }
}
