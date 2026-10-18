/** Hash de senha já pronto para gravar, com a versão do pepper que participou da derivação. */
export interface PasswordHash {
  /** Formato PHC: `$argon2id$v=19$m=...,t=...,p=...$<salt>$<hash>`. */
  hash: string;
  pepperId: string;
}

export interface PasswordVerification {
  matches: boolean;
  /** Parâmetros de custo ou pepper vigente mudaram: regravar o hash agora que a senha é conhecida. */
  needsRehash: boolean;
}

export interface PasswordHasher {
  hash(password: string): Promise<PasswordHash>;
  verify(password: string, stored: PasswordHash): Promise<PasswordVerification>;
  /** Mesmo custo de um verify real, para usuário inexistente (RN-04). Sempre "não confere". */
  verifyAgainstDummy(password: string): Promise<void>;
}
