import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "@src/infrastructure/database/repositories/prisma-user.repository";
import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { EmailAlreadyExistsError } from "@src/domain/errors/domain-error";
import { sqliteTestDatabase } from "../../../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("auth-repo-user");

function credentialFor(userId: string): PasswordCredential {
  return PasswordCredential.create({ userId, passwordHash: "$argon2id$hash", pepperId: "test" });
}

describe("PrismaUserRepository", () => {
  let prisma: PrismaClient;
  let repository: PrismaUserRepository;

  beforeAll(() => {
    testDb.push();
    prisma = testDb.client();
    repository = new PrismaUserRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    testDb.remove();
  });

  it("should find a created user by id and by email", async () => {
    const user = User.create({ name: "Smaug", email: "smaug@erebor.test" });

    expect(await repository.createWithPasswordCredential(user, credentialFor(user.id))).toEqual(
      user,
    );
    expect(await repository.findById(user.id)).toEqual(user);
    expect(await repository.findByEmail(user.email)).toEqual(user);
  });

  it("should return null for an unknown id or email", async () => {
    expect(await repository.findById("missing")).toBeNull();
    expect(await repository.findByEmail("missing@erebor.test")).toBeNull();
  });

  describe("createWithPasswordCredential", () => {
    it("should persist the user and the credential together", async () => {
      const user = User.create({ name: "Bilbo", email: "bilbo@shire.test" });
      const credential = credentialFor(user.id);

      expect(await repository.createWithPasswordCredential(user, credential)).toEqual(user);

      const stored = await prisma.passwordCredential.findUnique({ where: { userId: user.id } });
      expect(stored).toEqual({
        userId: user.id,
        passwordHash: credential.passwordHash,
        pepperId: credential.pepperId,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      });
    });

    it("should throw EmailAlreadyExistsError when the email is taken", async () => {
      const thorin = User.create({ name: "Thorin", email: "thorin@erebor.test" });
      await repository.createWithPasswordCredential(thorin, credentialFor(thorin.id));
      const duplicate = User.create({ name: "Other", email: "thorin@erebor.test" });

      await expect(
        repository.createWithPasswordCredential(duplicate, credentialFor(duplicate.id)),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
      expect(await prisma.passwordCredential.count({ where: { userId: duplicate.id } })).toBe(0);
    });

    it("should roll back the user when the credential cannot be written", async () => {
      const user = User.create({ name: "Gollum", email: "gollum@misty.test" });

      await expect(
        repository.createWithPasswordCredential(user, credentialFor("not-this-user")),
      ).rejects.toMatchObject({ code: "P2003" });
      expect(await repository.findById(user.id)).toBeNull();
    });

    it("should rethrow a uniqueness failure that is not about the email", async () => {
      const existing = User.create({ name: "Balin", email: "balin@moria.test" });
      await repository.createWithPasswordCredential(existing, credentialFor(existing.id));
      const sameId = User.create({ id: existing.id, name: "Dwalin", email: "dwalin@moria.test" });

      const failure = repository.createWithPasswordCredential(sameId, credentialFor(sameId.id));

      await expect(failure).rejects.toMatchObject({ code: "P2002" });
      await expect(failure).rejects.not.toBeInstanceOf(EmailAlreadyExistsError);
    });
  });
});
