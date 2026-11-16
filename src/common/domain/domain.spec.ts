import { BaseEntity } from './base.entity';
import { ValueObject } from './value-object';
import { Result } from './result';

class TestEntity extends BaseEntity<string> {
  constructor(
    id: string,
    public name: string,
  ) {
    super(id);
  }
}

interface MoneyProps {
  amount: number;
  currency: string;
}

class TestMoney extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }
  get currency(): string {
    return this.props.currency;
  }
}

describe('Domain Primitives', () => {
  describe('BaseEntity', () => {
    it('should determine equality based on entity ID, not mutable attributes', () => {
      const entity1 = new TestEntity('id-100', 'Original Name');
      const entity2 = new TestEntity('id-100', 'Updated Name');
      const entity3 = new TestEntity('id-200', 'Original Name');

      expect(entity1.equals(entity2)).toBe(true);
      expect(entity1.equals(entity3)).toBe(false);
      expect(entity1.equals(undefined)).toBe(false);
    });

    it('should initialize createdAt and updatedAt timestamps', () => {
      const entity = new TestEntity('id-1', 'Test');
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('ValueObject', () => {
    it('should determine equality based on structural property values', () => {
      const money1 = new TestMoney({ amount: 100, currency: 'USD' });
      const money2 = new TestMoney({ amount: 100, currency: 'USD' });
      const money3 = new TestMoney({ amount: 200, currency: 'USD' });

      expect(money1.equals(money2)).toBe(true);
      expect(money1.equals(money3)).toBe(false);
      expect(money1.equals(undefined)).toBe(false);
    });

    it('should determine equality regardless of property key order', () => {
      interface ComplexProps {
        a: number;
        b: string;
      }
      class ComplexVO extends ValueObject<ComplexProps> {}
      const vo1 = new ComplexVO({ a: 1, b: 'two' });
      const vo2 = new ComplexVO({ b: 'two', a: 1 });
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should freeze props preventing runtime mutation', () => {
      const money = new TestMoney({ amount: 100, currency: 'USD' });
      expect(Object.isFrozen(money['props'])).toBe(true);
    });
  });

  describe('Result Monad', () => {
    it('should create a successful result with value', () => {
      const result = Result.ok<number, string>(42);

      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.getValue()).toBe(42);
      expect(() => result.getError()).toThrow(/Cannot retrieve error/);
    });

    it('should create a failure result with error', () => {
      const result = Result.fail<number, string>('Invalid calculation');

      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBe('Invalid calculation');
      expect(() => result.getValue()).toThrow(/Cannot retrieve value/);
    });
  });
});
