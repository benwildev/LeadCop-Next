import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  extractDomain,
  isKnownDisposable,
  KNOWN_DISPOSABLE_DOMAINS,
} from "@/utils/email-validation";

describe("isValidEmail", () => {
  it("accepts a standard email address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts a subdomain email", () => {
    expect(isValidEmail("user@mail.example.com")).toBe(true);
  });

  it("accepts an email with plus sign", () => {
    expect(isValidEmail("user+tag@example.com")).toBe(true);
  });

  it("rejects an email without @", () => {
    expect(isValidEmail("notanemail")).toBe(false);
  });

  it("rejects an email without a domain part", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects an email without a TLD", () => {
    expect(isValidEmail("user@domain")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects a string with spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });
});

describe("extractDomain", () => {
  it("extracts the domain from a standard email", () => {
    expect(extractDomain("user@example.com")).toBe("example.com");
  });

  it("returns the domain in lowercase", () => {
    expect(extractDomain("user@EXAMPLE.COM")).toBe("example.com");
  });

  it("extracts subdomain correctly", () => {
    expect(extractDomain("user@mail.example.com")).toBe("mail.example.com");
  });

  it("returns empty string for an email without @", () => {
    expect(extractDomain("nodomain")).toBe("");
  });
});

describe("isKnownDisposable", () => {
  it("returns true for a known disposable domain", () => {
    expect(isKnownDisposable("test@mailinator.com")).toBe(true);
    expect(isKnownDisposable("user@guerrillamail.com")).toBe(true);
    expect(isKnownDisposable("hello@yopmail.com")).toBe(true);
  });

  it("returns false for a legitimate email domain", () => {
    expect(isKnownDisposable("user@gmail.com")).toBe(false);
    expect(isKnownDisposable("user@company.io")).toBe(false);
  });

  it("is case-insensitive for the domain part", () => {
    expect(isKnownDisposable("test@MAILINATOR.COM")).toBe(true);
  });
});

describe("KNOWN_DISPOSABLE_DOMAINS", () => {
  it("is a Set", () => {
    expect(KNOWN_DISPOSABLE_DOMAINS).toBeInstanceOf(Set);
  });

  it("contains mailinator.com", () => {
    expect(KNOWN_DISPOSABLE_DOMAINS.has("mailinator.com")).toBe(true);
  });

  it("contains at least 10 known domains", () => {
    expect(KNOWN_DISPOSABLE_DOMAINS.size).toBeGreaterThanOrEqual(10);
  });
});
