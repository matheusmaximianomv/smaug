import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LoginWithPasswordUseCase } from "@src/domain/use-cases/auth/login-with-password.use-case";
import type { AuthEventLogger } from "@src/domain/ports/auth-event-logger";
import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { InvalidCredentialsError } from "@src/domain/errors/domain-error";
import type { PasswordCredentialRepository } from "@src/domain/ports/password-credential.repository";
import type { PasswordHasher } from "@src/domain/ports/password-hasher";
import type { UserRepository } from "@src/domain/ports/user.repository";
import type { Mocked } from "../../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");
const PASSWORD = "correct horse battery";
const NEW_HASH = { hash: "$argon2id$v=19$m=1024,t=1,p=1$new$hash", pepperId: "p2" };

describe("LoginWithPasswordUseCase", () => {
  const userRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    createWithPasswordCredential: vi.fn(),
  } as unknown as Mocked<UserRepository>;
  const credentialRepository = {
    findByUserId: vi.fn(),
    update: vi.fn(),
  } as unknown as Mocked<PasswordCredentialRepository>;
  const passwordHasher = {
    hash: vi.fn(),
    verify: vi.fn(),
    verifyAgainstDummy: vi.fn(),
  } as unknown as Mocked<PasswordHasher>;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as Mocked<AuthEventLogger>;
  const useCase = new LoginWithPasswordUseCase(
    userRepository,
    credentialRepository,
    passwordHasher,
    logger,
  );

  const user = User.create({ name: "Ana", email: "ana@exemplo.com" });
  const credential = PasswordCredential.create({
    userId: user.id,
    passwordHash: "$argon2id$v=19$m=1024,t=1,p=1$old$hash",
    pepperId: "p1",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
  const input = { email: "ANA@exemplo.com ", password: PASSWORD };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    userRepository.findByEmail.mockResolvedValue(user);
    credentialRepository.findByUserId.mockResolvedValue(credential);
    credentialRepository.update.mockImplementation(async (updated) => updated);
    passwordHasher.verify.mockResolvedValue({ matches: true, needsRehash: false });
    passwordHasher.hash.mockResolvedValue(NEW_HASH);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the user when the password matches", async () => {
    const result = await useCase.execute(input);

    expect(result).toBe(user);
    expect(passwordHasher.verify).toHaveBeenCalledWith(PASSWORD, {
      hash: credential.passwordHash,
      pepperId: "p1",
    });
    expect(passwordHasher.verifyAgainstDummy).not.toHaveBeenCalled();
    expect(credentialRepository.update).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("auth.login.succeeded", {
      userId: user.id,
      authMethod: "password",
    });
  });

  it("should find the user by the normalized email", async () => {
    await useCase.execute(input);

    expect(userRepository.findByEmail).toHaveBeenCalledWith("ana@exemplo.com");
  });

  it("should throw InvalidCredentialsError when the password is wrong", async () => {
    passwordHasher.verify.mockResolvedValue({ matches: false, needsRehash: false });

    await expect(useCase.execute(input)).rejects.toThrow(InvalidCredentialsError);
    expect(passwordHasher.verifyAgainstDummy).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("auth.login.failed", { userId: user.id });
  });

  it("should verify against the dummy hash when the user does not exist", async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidCredentialsError);
    expect(passwordHasher.verifyAgainstDummy).toHaveBeenCalledWith(PASSWORD);
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(credentialRepository.findByUserId).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("auth.login.failed", {});
  });

  it("should verify against the dummy hash when the account has no password", async () => {
    credentialRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidCredentialsError);
    expect(passwordHasher.verifyAgainstDummy).toHaveBeenCalledWith(PASSWORD);
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("auth.login.failed", { userId: user.id });
  });

  it("should throw the same error for an unknown email and a wrong password", async () => {
    passwordHasher.verify.mockResolvedValue({ matches: false, needsRehash: false });
    const wrongPassword = (await useCase.execute(input).catch((error: unknown) => error)) as Error;
    userRepository.findByEmail.mockResolvedValue(null);

    const unknownEmail = (await useCase.execute(input).catch((error: unknown) => error)) as Error;

    expect(unknownEmail).toBeInstanceOf(InvalidCredentialsError);
    expect(unknownEmail.message).toBe(wrongPassword.message);
    expect(unknownEmail.message).not.toContain("ana@exemplo.com");
  });

  it("should propagate a configuration error from the hasher instead of InvalidCredentials", async () => {
    passwordHasher.verify.mockRejectedValue(new Error("Unknown pepper id"));

    await expect(useCase.execute(input)).rejects.toThrow("Unknown pepper id");
  });

  it("should rehash the credential when the hasher asks for it", async () => {
    passwordHasher.verify.mockResolvedValue({ matches: true, needsRehash: true });

    const result = await useCase.execute(input);

    expect(result).toBe(user);
    expect(passwordHasher.hash).toHaveBeenCalledWith(PASSWORD);
    const [updated] = credentialRepository.update.mock.calls[0];
    expect(updated.passwordHash).toBe(NEW_HASH.hash);
    expect(updated.pepperId).toBe("p2");
    expect(updated.createdAt.toISOString()).toBe(CREATED_AT.toISOString());
    expect(updated.updatedAt.toISOString()).toBe(BASE_DATE.toISOString());
    expect(logger.info).toHaveBeenCalledWith("auth.password.rehashed", {
      userId: user.id,
      pepperId: "p2",
    });
  });

  it("should still log the user in and log an error when saving the rehash fails", async () => {
    passwordHasher.verify.mockResolvedValue({ matches: true, needsRehash: true });
    credentialRepository.update.mockRejectedValue(new Error("database is locked"));

    const result = await useCase.execute(input);

    expect(result).toBe(user);
    expect(logger.error).toHaveBeenCalledWith("auth.password.rehash_failed", {
      userId: user.id,
      error: "database is locked",
    });
    expect(logger.info).toHaveBeenCalledWith("auth.login.succeeded", expect.any(Object));
  });

  it("should still log the user in when the rehash rejects with a non-Error value", async () => {
    passwordHasher.verify.mockResolvedValue({ matches: true, needsRehash: true });
    passwordHasher.hash.mockRejectedValue("argon2 unavailable");

    const result = await useCase.execute(input);

    expect(result).toBe(user);
    expect(credentialRepository.update).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("auth.password.rehash_failed", {
      userId: user.id,
      error: "argon2 unavailable",
    });
  });
});
