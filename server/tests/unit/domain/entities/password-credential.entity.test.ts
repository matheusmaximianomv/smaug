import { describe, it, expect } from "vitest";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";

const CREATED_AT = new Date("2026-01-10T12:00:00.000Z");
const LATER = new Date("2026-03-01T08:30:00.000Z");

const baseProps = {
  userId: "user-1",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$salt$hash",
  pepperId: "p1",
};

describe("PasswordCredential", () => {
  describe("create", () => {
    it("should create a credential when all props are provided", () => {
      const credential = PasswordCredential.create({
        ...baseProps,
        createdAt: CREATED_AT,
        updatedAt: LATER,
      });

      expect(credential.userId).toBe("user-1");
      expect(credential.passwordHash).toBe(baseProps.passwordHash);
      expect(credential.pepperId).toBe("p1");
      expect(credential.createdAt).toBe(CREATED_AT);
      expect(credential.updatedAt).toBe(LATER);
    });

    it("should default both timestamps to the same instant when they are omitted", () => {
      const credential = PasswordCredential.create(baseProps);

      expect(credential.createdAt).toBeInstanceOf(Date);
      expect(credential.updatedAt).toBe(credential.createdAt);
    });

    it("should throw when the password hash is empty", () => {
      expect(() => PasswordCredential.create({ ...baseProps, passwordHash: "" })).toThrow(
        "Password hash must not be empty",
      );
    });

    it("should throw when the pepper id is empty", () => {
      expect(() => PasswordCredential.create({ ...baseProps, pepperId: "" })).toThrow(
        "Pepper id must not be empty",
      );
    });
  });

  describe("withNewHash", () => {
    const original = PasswordCredential.create({
      ...baseProps,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });

    it("should return a new credential with the new hash and pepper when rehashing", () => {
      const rehashed = original.withNewHash({ hash: "$argon2id$v=19$new", pepperId: "p2" }, LATER);

      expect(rehashed).not.toBe(original);
      expect(rehashed.userId).toBe("user-1");
      expect(rehashed.passwordHash).toBe("$argon2id$v=19$new");
      expect(rehashed.pepperId).toBe("p2");
      expect(rehashed.createdAt).toBe(CREATED_AT);
      expect(rehashed.updatedAt).toBe(LATER);
    });

    it("should leave the original credential untouched when rehashing", () => {
      original.withNewHash({ hash: "$argon2id$v=19$new", pepperId: "p2" }, LATER);

      expect(original.passwordHash).toBe(baseProps.passwordHash);
      expect(original.pepperId).toBe("p1");
      expect(original.updatedAt).toBe(CREATED_AT);
    });

    it("should throw when the new hash is empty", () => {
      expect(() => original.withNewHash({ hash: "", pepperId: "p2" }, LATER)).toThrow(
        "Password hash must not be empty",
      );
    });

    it("should throw when the new pepper id is empty", () => {
      expect(() =>
        original.withNewHash({ hash: "$argon2id$v=19$new", pepperId: "" }, LATER),
      ).toThrow("Pepper id must not be empty");
    });
  });
});
