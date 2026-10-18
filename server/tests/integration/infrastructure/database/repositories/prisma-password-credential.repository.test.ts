import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaPasswordCredentialRepository } from "@src/infrastructure/database/repositories/prisma-password-credential.repository";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { sqliteTestDatabase } from "../../../../helpers/sqlite-test-database";
import { NOW, at, insertUser } from "../../../../helpers/auth-session-fixtures";

const testDb = sqliteTestDatabase("auth-repo-credential");

describe("PrismaPasswordCredentialRepository", () => {
  let prisma: PrismaClient;
  let repository: PrismaPasswordCredentialRepository;

  beforeAll(() => {
    testDb.push();
    prisma = testDb.client();
    repository = new PrismaPasswordCredentialRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    testDb.remove();
  });

  async function storedCredential(): Promise<PasswordCredential> {
    const userId = await insertUser(prisma);
    const credential = PasswordCredential.create({
      userId,
      passwordHash: "$argon2id$old",
      pepperId: "old",
      createdAt: NOW,
      updatedAt: NOW,
    });
    await prisma.passwordCredential.create({ data: { ...credential } });
    return credential;
  }

  it("should find the credential of a user", async () => {
    const credential = await storedCredential();

    expect(await repository.findByUserId(credential.userId)).toEqual(credential);
  });

  it("should return null when the user has no credential", async () => {
    const userId = await insertUser(prisma);

    expect(await repository.findByUserId(userId)).toBeNull();
  });

  it("should replace hash and pepper, keeping createdAt", async () => {
    const credential = await storedCredential();
    const rehashed = credential.withNewHash({ hash: "$argon2id$new", pepperId: "new" }, at(60));

    const updated = await repository.update(rehashed);

    expect(updated).toEqual(rehashed);
    expect(await repository.findByUserId(credential.userId)).toEqual({
      ...rehashed,
      createdAt: NOW,
      updatedAt: at(60),
    });
  });
});
