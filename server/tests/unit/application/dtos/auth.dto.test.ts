import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@src/application/dtos/auth.dto";

const messageOf = (result: { error?: { issues: { message: string }[] } }): string | undefined =>
  result.error?.issues[0].message;

describe("registerSchema", () => {
  const valid = { name: "Ana", email: "ana@exemplo.com", password: "correct horse battery" };

  it("should accept a complete payload", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("should accept an email with surrounding spaces and uppercase letters", () => {
    expect(registerSchema.safeParse({ ...valid, email: "  Ana@Exemplo.COM " }).success).toBe(true);
  });

  it.each([
    ["name", { name: undefined }, "Name is required"],
    ["name", { name: "" }, "Name must be between 1 and 255 characters"],
    ["name", { name: "a".repeat(256) }, "Name must be between 1 and 255 characters"],
    ["email", { email: undefined }, "Email is required"],
    ["email", { email: "ana@" }, "Invalid email format"],
    ["email", { email: `${"a".repeat(250)}@x.com` }, "Email must be at most 254 characters"],
    ["password", { password: undefined }, "Password is required"],
  ])("should reject an invalid %s with the domain message", (_field, override, message) => {
    const result = registerSchema.safeParse({ ...valid, ...override });

    expect(result.success).toBe(false);
    expect(messageOf(result)).toBe(message);
  });

  it.each([
    [11, false],
    [12, true],
    [128, true],
    [129, false],
  ])("should apply the password policy to a %i-character password", (length, accepted) => {
    const result = registerSchema.safeParse({ ...valid, password: "a".repeat(length) });

    expect(result.success).toBe(accepted);
    if (!accepted) {
      expect(messageOf(result)).toBe("Password must be between 12 and 128 characters");
    }
  });
});

describe("loginSchema", () => {
  const valid = { email: "ANA@exemplo.com", password: "correct horse battery" };

  it("should accept a complete payload", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("should not apply the minimum password length", () => {
    expect(loginSchema.safeParse({ ...valid, password: "short" }).success).toBe(true);
  });

  it("should accept a password at the maximum length", () => {
    expect(loginSchema.safeParse({ ...valid, password: "a".repeat(128) }).success).toBe(true);
  });

  it("should count the maximum length after NFKC normalization", () => {
    const result = loginSchema.safeParse({ ...valid, password: "ﬁ".repeat(65) });

    expect(result.success).toBe(false);
    expect(messageOf(result)).toBe("Password must be at most 128 characters");
  });

  it.each([
    ["email", { email: undefined }, "Email is required"],
    ["email", { email: "not-an-email" }, "Invalid email format"],
    ["password", { password: undefined }, "Password is required"],
    ["password", { password: "a".repeat(129) }, "Password must be at most 128 characters"],
  ])("should reject an invalid %s", (_field, override, message) => {
    const result = loginSchema.safeParse({ ...valid, ...override });

    expect(result.success).toBe(false);
    expect(messageOf(result)).toBe(message);
  });
});
