import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RegisterWithPasswordUseCase } from "@src/domain/use-cases/auth/register-with-password.use-case";
import type { AuthEventLogger } from "@src/domain/ports/auth-event-logger";
import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { EmailAlreadyExistsError } from "@src/domain/errors/domain-error";
import type { PasswordHasher } from "@src/domain/ports/password-hasher";
import type { UserRepository } from "@src/domain/ports/user.repository";
import type { Mocked } from "../../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const PASSWORD = "correct horse battery";
const HASH = { hash: "$argon2id$v=19$m=1024,t=1,p=1$salt$hash", pepperId: "p1" };

describe("RegisterWithPasswordUseCase", () => {
  const userRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    createWithPasswordCredential: vi.fn(),
  } as unknown as Mocked<UserRepository>;
  const passwordHasher = {
    hash: vi.fn(),
    verify: vi.fn(),
    verifyAgainstDummy: vi.fn(),
  } as unknown as Mocked<PasswordHasher>;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as Mocked<AuthEventLogger>;
  const useCase = new RegisterWithPasswordUseCase(userRepository, passwordHasher, logger);
  const input = { name: "Ana", email: "  Ana@Exemplo.COM ", password: PASSWORD };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue(HASH);
    userRepository.createWithPasswordCredential.mockImplementation(async (user) => user);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create the user and the credential together when the input is valid", async () => {
    const result = await useCase.execute(input);

    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe("ana@exemplo.com");
    expect(passwordHasher.hash).toHaveBeenCalledWith(PASSWORD);
    const [user, credential] = userRepository.createWithPasswordCredential.mock.calls[0];
    expect(user).toBe(result);
    expect(credential).toBeInstanceOf(PasswordCredential);
    expect(credential.userId).toBe(result.id);
    expect(credential.passwordHash).toBe(HASH.hash);
    expect(credential.pepperId).toBe(HASH.pepperId);
    expect(credential.createdAt.toISOString()).toBe(BASE_DATE.toISOString());
    expect(logger.info).toHaveBeenCalledWith("auth.register", { userId: result.id });
  });

  it("should look the email up already normalized", async () => {
    await useCase.execute(input);

    expect(userRepository.findByEmail).toHaveBeenCalledWith("ana@exemplo.com");
  });

  it("should throw EmailAlreadyExistsError without hashing when the email is taken", async () => {
    userRepository.findByEmail.mockResolvedValue(
      User.create({ name: "Outra", email: "ana@exemplo.com" }),
    );

    await expect(useCase.execute(input)).rejects.toThrow(EmailAlreadyExistsError);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(userRepository.createWithPasswordCredential).not.toHaveBeenCalled();
  });

  it("should propagate EmailAlreadyExistsError raised by the repository in a race", async () => {
    userRepository.createWithPasswordCredential.mockRejectedValue(
      new EmailAlreadyExistsError("ana@exemplo.com"),
    );

    await expect(useCase.execute(input)).rejects.toThrow(EmailAlreadyExistsError);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("should reject a weak password without touching the repository or the hasher", async () => {
    await expect(useCase.execute({ ...input, password: "short" })).rejects.toThrow(
      "Password must be between 12 and 128 characters",
    );
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
  });

  it("should reject an invalid name without touching the repository", async () => {
    await expect(useCase.execute({ ...input, name: " " })).rejects.toThrow(
      "Name must be between 1 and 255 characters",
    );
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });
});
