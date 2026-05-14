import { describe, it, expect } from "vitest";
import { isGcsQuotaBody, StorageQuotaError } from "./objectStorage";

describe("isGcsQuotaBody", () => {
  it("detects GCS XML QuotaExceeded", () => {
    const xml = `<?xml version='1.0' encoding='UTF-8'?><Error><Code>QuotaExceeded</Code><Message>The project exceeded its quota for write operations.</Message></Error>`;
    expect(isGcsQuotaBody(xml)).toBe(true);
  });

  it("detects GCS XML AccountDisabled (billing / budget cap)", () => {
    const xml = `<?xml version='1.0' encoding='UTF-8'?><Error><Code>AccountDisabled</Code><Message>The billing account for the project is disabled.</Message></Error>`;
    expect(isGcsQuotaBody(xml)).toBe(true);
  });

  it("detects JSON RESOURCE_EXHAUSTED", () => {
    const json = JSON.stringify({
      error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for quota metric" },
    });
    expect(isGcsQuotaBody(json)).toBe(true);
  });

  it("detects budget_exceeded text", () => {
    expect(isGcsQuotaBody("BudgetExceeded: your budget cap was reached")).toBe(true);
  });

  it("does NOT flag a generic 403 access denied error", () => {
    const xml = `<?xml version='1.0' encoding='UTF-8'?><Error><Code>AccessDenied</Code><Message>Access denied.</Message></Error>`;
    expect(isGcsQuotaBody(xml)).toBe(false);
  });

  it("does NOT flag a generic network error string", () => {
    expect(isGcsQuotaBody("Connection reset by peer")).toBe(false);
  });

  it("does NOT flag an empty string", () => {
    expect(isGcsQuotaBody("")).toBe(false);
  });
});

describe("StorageQuotaError", () => {
  it("has status 507 and code storage_quota_exceeded", () => {
    const err = new StorageQuotaError("test message");
    expect(err.status).toBe(507);
    expect(err.code).toBe("storage_quota_exceeded");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(StorageQuotaError);
    expect(err).toBeInstanceOf(Error);
  });

  it("uses default message when none supplied", () => {
    const err = new StorageQuotaError();
    expect(err.message).toBe("Storage quota exceeded");
  });

  it("instanceof check works across throw/catch boundary", () => {
    function thrower() { throw new StorageQuotaError("quota hit"); }
    expect(() => thrower()).toThrowError(StorageQuotaError);
  });
});
