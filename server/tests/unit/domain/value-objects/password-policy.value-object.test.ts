import { describe, it, expect } from "vitest";
import { PasswordPolicy } from "@src/domain/value-objects/password-policy.value-object";

const message = "Password must be between 12 and 128 characters";

describe("PasswordPolicy", () => {
  it.each([12, 128])("should accept a password with %i characters", (length) => {
    expect(() => PasswordPolicy.assert("a".repeat(length))).not.toThrow();
  });

  it.each([0, 11, 129])("should throw when the password has %i characters", (length) => {
    expect(() => PasswordPolicy.assert("a".repeat(length))).toThrow(message);
  });

  it("should count code points instead of UTF-16 units when the password has astral characters", () => {
    expect(() => PasswordPolicy.assert("😀".repeat(12))).not.toThrow();
    expect(() => PasswordPolicy.assert("😀".repeat(129))).toThrow(message);
  });

  it("should count after NFKC normalization when a ligature expands into several characters", () => {
    // "ﬁ" (U+FB01) vira "fi" no NFKC: 6 ligaduras são 12 code points.
    expect(() => PasswordPolicy.assert("ﬁ".repeat(6))).not.toThrow();
    expect(() => PasswordPolicy.assert("ﬁ".repeat(65))).toThrow(message);
  });

  it("should count after NFKC normalization when combining marks compose into one character", () => {
    // "e" + acento combinante (2 code points) vira "é" (1) no NFKC: 12 pares são 12 code points.
    expect(() => PasswordPolicy.assert("é".repeat(12))).not.toThrow();
    expect(() => PasswordPolicy.assert("é".repeat(11))).toThrow(message);
  });

  it("should not trim spaces when they are part of the password", () => {
    expect(() => PasswordPolicy.assert(" ".repeat(12))).not.toThrow();
    expect(() => PasswordPolicy.assert(`  ${"a".repeat(10)}`)).not.toThrow();
    expect(() => PasswordPolicy.assert(` ${"a".repeat(10)}`)).toThrow(message);
  });
});
