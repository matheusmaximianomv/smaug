import { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import { AuthEventLogger } from "@src/domain/ports/auth-event-logger";

export interface RevokeAllSessionsInput {
  userId: string;
}

/** "Sair de todos os dispositivos": revoga todas as sessões ativas do usuário, inclusive a corrente. */
export class RevokeAllSessionsUseCase {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly logger: AuthEventLogger,
  ) {}

  public async execute(input: RevokeAllSessionsInput): Promise<void> {
    await this.sessionRepository.revokeAllForUser(input.userId, "LOGOUT_ALL", new Date());
    this.logger.info("auth.session.revoked", { userId: input.userId, reason: "LOGOUT_ALL" });
  }
}
