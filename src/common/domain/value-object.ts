/**
 * Base abstract class for Domain Value Objects.
 * Value Objects are immutable concepts characterized solely by their properties, with no distinct identity.
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  /**
   * Value Objects are compared by their structural properties, not by identity.
   */
  equals(other?: ValueObject<TProps>): boolean {
    if (!other || !(other instanceof ValueObject)) {
      return false;
    }
    return this.deepEqual(this.props, other.props);
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      return false;
    }
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      const valA = (a as Record<string, unknown>)[key];
      const valB = (b as Record<string, unknown>)[key];
      if (!this.deepEqual(valA, valB)) return false;
    }
    return true;
  }
}
