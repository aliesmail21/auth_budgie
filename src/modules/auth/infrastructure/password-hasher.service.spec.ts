import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  let hasher: PasswordHasherService;

  beforeEach(() => {
    hasher = new PasswordHasherService();
  });

  it('should hash a password using Argon2id and never return plaintext', async () => {
    const plain = 'StrongP@ssw0rd123';
    const hash = await hasher.hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);
    expect(hash).toContain('$argon2id$');
  });

  it('should verify matching passwords correctly', async () => {
    const plain = 'StrongP@ssw0rd123';
    const hash = await hasher.hashPassword(plain);

    const isValid = await hasher.verifyPassword(hash, plain);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const plain = 'StrongP@ssw0rd123';
    const hash = await hasher.hashPassword(plain);

    const isValid = await hasher.verifyPassword(hash, 'WrongPassword123');
    expect(isValid).toBe(false);
  });
});
