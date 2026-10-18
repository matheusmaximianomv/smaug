import { describe, it, expect } from "vitest";
import { EmailAddress } from "@src/domain/value-objects/email-address.value-object";

const domain = "@example.com";

describe("EmailAddress", () => {
  describe("normalization", () => {
    it("should trim and lowercase the value when it has spaces and mixed case", () => {
      expect(EmailAddress.create("  Joao.Silva@Example.COM \t").value).toBe(
        "joao.silva@example.com",
      );
    });

    it("should be idempotent when created from an already normalized value", () => {
      const first = EmailAddress.create("  MARIA@Example.com ");
      expect(EmailAddress.create(first.value).value).toBe(first.value);
    });

    it("should preserve dots and the plus suffix of the local part", () => {
      const dotted = EmailAddress.create("Ana.Silva@gmail.com");
      const tagged = EmailAddress.create("anasilva+smaug@gmail.com");

      expect(dotted.value).toBe("ana.silva@gmail.com");
      expect(tagged.value).toBe("anasilva+smaug@gmail.com");
      expect(dotted.value).not.toBe(tagged.value);
    });
  });

  describe("format", () => {
    it.each(["", "   ", "invalid", "testexample.com", "test@", "test@domain", "a b@example.com"])(
      "should throw when the value is %j",
      (raw) => {
        expect(() => EmailAddress.create(raw)).toThrow("Invalid email format");
      },
    );
  });

  describe("length", () => {
    it("should accept a value with exactly 254 characters", () => {
      const raw = "a".repeat(254 - domain.length) + domain;
      expect(EmailAddress.create(raw).value).toHaveLength(254);
    });

    it("should throw when the value exceeds 254 characters", () => {
      const raw = "a".repeat(255 - domain.length) + domain;
      expect(() => EmailAddress.create(raw)).toThrow("Email must be at most 254 characters");
    });

    it("should count the length after trimming when the raw value has surrounding spaces", () => {
      const raw = `  ${"a".repeat(254 - domain.length)}${domain}  `;
      expect(EmailAddress.create(raw).value).toHaveLength(254);
    });
  });
});
