const MAX_EMAIL_LENGTH = 254;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * E-mail normalizado (sem espaços nas pontas, em minúsculas) e validado. É a única normalização de
 * e-mail do domínio: cadastro, login e `User.create` passam por aqui, para que a mesma pessoa não
 * vire duas contas por diferença de caixa ou de espaço.
 */
export class EmailAddress {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(raw: string): EmailAddress {
    const normalized = raw.trim().toLowerCase();
    EmailAddress.validateFormat(normalized);
    EmailAddress.validateLength(normalized);
    return new EmailAddress(normalized);
  }

  private static validateFormat(email: string): void {
    if (!EMAIL_FORMAT.test(email)) {
      throw new Error("Invalid email format");
    }
  }

  private static validateLength(email: string): void {
    if (email.length > MAX_EMAIL_LENGTH) {
      throw new Error("Email must be at most 254 characters");
    }
  }
}
