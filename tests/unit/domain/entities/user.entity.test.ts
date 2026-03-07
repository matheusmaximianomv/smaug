import { describe, it, expect } from "vitest";
import { User } from "@src/domain/entities/user.entity";

describe("User Entity", () => {
  describe("create", () => {
    it("should create a valid user when all props are provided", () => {
      const user = User.create({ name: "João Silva", email: "joao@example.com" });
      expect(user.id).toBeDefined();
      expect(user.name).toBe("João Silva");
      expect(user.email).toBe("joao@example.com");
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("should generate a UUID when no id is provided", () => {
      const user = User.create({ name: "Test", email: "test@test.com" });
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("should use provided id when id is given", () => {
      const user = User.create({ id: "custom-id", name: "Test", email: "test@test.com" });
      expect(user.id).toBe("custom-id");
    });

    it("should trim name when name has leading/trailing spaces", () => {
      const user = User.create({ name: "  João  ", email: "joao@example.com" });
      expect(user.name).toBe("João");
    });

    it("should lowercase and trim email when email has mixed case and spaces", () => {
      const user = User.create({ name: "Test", email: "  JOAO@Example.COM  " });
      expect(user.email).toBe("joao@example.com");
    });
  });

  describe("name validation", () => {
    it("should throw error when name is empty", () => {
      expect(() => User.create({ name: "", email: "test@test.com" })).toThrow(
        "Name must be between 1 and 255 characters",
      );
    });

    it("should throw error when name is whitespace-only", () => {
      expect(() => User.create({ name: "   ", email: "test@test.com" })).toThrow(
        "Name must be between 1 and 255 characters",
      );
    });

    it("should throw error when name exceeds 255 characters", () => {
      const longName = "a".repeat(256);
      expect(() => User.create({ name: longName, email: "test@test.com" })).toThrow(
        "Name must be between 1 and 255 characters",
      );
    });

    it("should accept name when it has exactly 255 characters", () => {
      const name = "a".repeat(255);
      const user = User.create({ name, email: "test@test.com" });
      expect(user.name).toBe(name);
    });

    it("should accept name when it has a single character", () => {
      const user = User.create({ name: "A", email: "test@test.com" });
      expect(user.name).toBe("A");
    });
  });

  describe("email validation", () => {
    it("should throw error when email format is invalid", () => {
      expect(() => User.create({ name: "Test", email: "invalid" })).toThrow(
        "Invalid email format",
      );
    });

    it("should throw error when email has no @ symbol", () => {
      expect(() => User.create({ name: "Test", email: "testexample.com" })).toThrow(
        "Invalid email format",
      );
    });

    it("should throw error when email has no domain", () => {
      expect(() => User.create({ name: "Test", email: "test@" })).toThrow(
        "Invalid email format",
      );
    });

    it("should accept email when format is valid", () => {
      const user = User.create({ name: "Test", email: "user@domain.com" });
      expect(user.email).toBe("user@domain.com");
    });
  });
});
