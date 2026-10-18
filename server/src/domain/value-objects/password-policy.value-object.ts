const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Regra de tamanho da senha (RN-03): 12 a 128 code points depois da normalização NFKC — a mesma
 * que o hasher aplica antes de derivar — e sem `trim`, porque espaço é caractere de senha.
 */
export class PasswordPolicy {
  public static assert(password: string): void {
    const length = [...password.normalize("NFKC")].length;
    if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
      throw new Error("Password must be between 12 and 128 characters");
    }
  }
}
