import { Money } from './money.value-object';
import { AppError } from '../errors/app-error';

describe('Money Value Object', () => {
  describe('Creation & Conversion', () => {
    it('should create money from cents and convert to decimal', () => {
      const money = Money.fromCents(1050, 'USD');
      expect(money.amountInCents).toBe(1050);
      expect(money.currency).toBe('USD');
      expect(money.toDecimal()).toBe(10.5);
      expect(money.format()).toBe('USD 10.50');
    });

    it('should create money from decimal accurately without floating-point drift', () => {
      const money = Money.fromDecimal(19.99, 'EUR');
      expect(money.amountInCents).toBe(1999);
      expect(money.currency).toBe('EUR');
      expect(money.toDecimal()).toBe(19.99);
    });

    it('should reject invalid currency codes', () => {
      expect(() => Money.fromCents(100, 'US')).toThrow(AppError);
      expect(() => Money.fromCents(100, 'TOOLONG')).toThrow(AppError);
      expect(() => Money.fromCents(100, '123')).toThrow(AppError);
    });

    it('should reject non-integer cents', () => {
      expect(() => Money.fromCents(10.5, 'USD')).toThrow(AppError);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should add money of the same currency accurately (0.1 + 0.2 === 0.3)', () => {
      const a = Money.fromDecimal(0.1, 'USD');
      const b = Money.fromDecimal(0.2, 'USD');
      const sum = a.add(b);

      expect(sum.amountInCents).toBe(30);
      expect(sum.toDecimal()).toBe(0.3);
    });

    it('should subtract money of the same currency', () => {
      const a = Money.fromDecimal(50.0, 'USD');
      const b = Money.fromDecimal(15.25, 'USD');
      const diff = a.subtract(b);

      expect(diff.toDecimal()).toBe(34.75);
    });

    it('should throw currency mismatch error when adding different currencies', () => {
      const usd = Money.fromDecimal(10, 'USD');
      const eur = Money.fromDecimal(10, 'EUR');

      expect(() => usd.add(eur)).toThrow(AppError);
      expect(() => usd.subtract(eur)).toThrow(AppError);
      expect(() => usd.isGreaterThan(eur)).toThrow(AppError);
    });

    it('should multiply money by a factor and round to nearest cent', () => {
      const money = Money.fromDecimal(10.0, 'USD');
      const multiplied = money.multiply(1.0825); // 8.25% tax

      expect(multiplied.amountInCents).toBe(1083);
      expect(multiplied.toDecimal()).toBe(10.83);
    });
  });

  describe('Allocation / Split Calculation (Fowler Pattern)', () => {
    it('should allocate 10.00 split 3 ways without losing a cent (3.34, 3.33, 3.33 = 10.00)', () => {
      const total = Money.fromDecimal(10.0, 'USD');
      const splits = total.allocate([1, 1, 1]);

      expect(splits).toHaveLength(3);
      expect(splits[0]!.amountInCents).toBe(334);
      expect(splits[1]!.amountInCents).toBe(333);
      expect(splits[2]!.amountInCents).toBe(333);

      const sum = splits.reduce((acc, curr) => acc + curr.amountInCents, 0);
      expect(sum).toBe(1000);
    });

    it('should allocate by custom ratios (70% and 30%)', () => {
      const total = Money.fromDecimal(100.0, 'USD');
      const splits = total.allocate([70, 30]);

      expect(splits[0]!.toDecimal()).toBe(70.0);
      expect(splits[1]!.toDecimal()).toBe(30.0);
    });
  });

  describe('Predicates & Comparisons', () => {
    it('should check zero, positive, and negative correctly', () => {
      expect(Money.zero('USD').isZero()).toBe(true);
      expect(Money.fromDecimal(10, 'USD').isPositive()).toBe(true);
      expect(Money.fromDecimal(-5, 'USD').isNegative()).toBe(true);
    });

    it('should compare amounts of same currency', () => {
      const small = Money.fromDecimal(10, 'USD');
      const large = Money.fromDecimal(20, 'USD');

      expect(large.isGreaterThan(small)).toBe(true);
      expect(small.isLessThan(large)).toBe(true);
    });
  });
});
