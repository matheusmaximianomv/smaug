import { describe, it, expect } from "vitest";
import { User } from "@src/domain/entities/user.entity";

describe("User Entity", () => {
  describe("create", () => {
    it("should create a valid user", () => {
      const user = User.create({ name: "João Silva", email: "joao@example.com" });
      expect(user.id).toBeDefined();
      expect(user.name).toBe("João Silva");
      expect(user.email).toBe("joao@example.com");
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("should generate a UUID if none provided", () => {
      const user = User.create({ name: "Test", email: "test@test.com" });
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("should use provided id", () => {
      const user = User.create({ id: "custom-id", name: "Test", email: "test@test.com" });
      expect(user.id).toBe("custom-id");
    });

    it("should trim name", () => {
      const user = User.create({ name: "  João  ", email: "joao@example.com" });
      expect(user.name).toBe("João");
    });

    it("should lowercase and trim email", () => {
      const user = User.create({ name: "Test", email: "  JOAO@Example.COM  " });
      expect(user.email).toBe("joao@example.com");
    });
  });

  describe("name validation", () => {
    it("should reject empty name", () => {
      expect(() => User.create({ name: "", email: "test@test.com" })).toThrow(
        "Name must be between 1 and 255 characters",
      );
    });

    it("should reject whitespace-only name", () => {
      expect(() => User.create({ name: "   ", email: "test@test.com" })).toThrow(
        "Name must be between 1 and 255 characters",
      );
    });

    it("should reject name > 255 characters", () => {
      const longName = "a".repeat(256);
      expect(() => User.create({ name: longName, email: "test@test.com" })).toThrow(
        "Name must be between 1 and 255 characters",
      );
    });

    it("should accept name with exactly 255 characters", () => {
      const name = "a".repeat(255);
      const user = User.create({ name, email: "test@test.com" });
      expect(user.name).toBe(name);
    });

    it("should accept single character name", () => {
      const user = User.create({ name: "A", email: "test@test.com" });
      expect(user.name).toBe("A");
    });
  });

  describe("email validation", () => {
    it("should reject invalid email format", () => {
      expect(() => User.create({ name: "Test", email: "invalid" })).toThrow(
        "Invalid email format",
      );
    });

    it("should reject email without @", () => {
      expect(() => User.create({ name: "Test", email: "testexample.com" })).toThrow(
        "Invalid email format",
      );
    });

    it("should reject email without domain", () => {
      expect(() => User.create({ name: "Test", email: "test@" })).toThrow(
        "Invalid email format",
      );
    });

    it("should accept valid email", () => {
      const user = User.create({ name: "Test", email: "user@domain.com" });
      expect(user.email).toBe("user@domain.com");
    });
  });
});
