/**
 * O que os casos de uso de autenticação precisam para registrar eventos de segurança (§14 da
 * especificação técnica). Fica no domínio porque `domain` não importa `application`, onde mora o
 * `Logger`; o `Logger` do projeto a satisfaz estruturalmente e é ele que o container injeta.
 * O contexto leva só identificadores (`userId`, `sessionId`, `reason`): nunca senha, hash, token
 * nem o e-mail digitado.
 */
export interface AuthEventLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
