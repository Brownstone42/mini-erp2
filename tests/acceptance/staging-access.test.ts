import { describe, expect, it } from "vitest";
import { checkStagingAccess } from "../../src/security/staging-access";

const settings = { NODE_ENV: "production", STAGING_AUTH_USER: "reviewer", STAGING_AUTH_PASSWORD: "long-test-password-123" };
const basic = (value: string) => `Basic ${Buffer.from(value).toString("base64")}`;

describe("staging access", () => {
  it("requires credentials in production even when not explicitly enabled", () => {
    expect(checkStagingAccess(null, settings)).toBe("unauthorized");
  });
  it.each([null, "", "Bearer token", "Basic !!!", basic("reviewer:wrong"), basic("wrong:long-test-password-123")])("rejects missing, malformed or wrong credentials: %s", (header) => {
    expect(checkStagingAccess(header, settings)).toBe("unauthorized");
  });
  it("accepts the correct credentials", () => {
    expect(checkStagingAccess(basic("reviewer:long-test-password-123"), settings)).toBe("allowed");
  });
  it.each([{}, { STAGING_AUTH_USER: "reviewer" }, { STAGING_AUTH_USER: "reviewer", STAGING_AUTH_PASSWORD: "short" }])("fails closed for missing or weak configuration", (credentials) => {
    expect(checkStagingAccess(null, { NODE_ENV: "production", ...credentials })).toBe("unconfigured");
  });
  it("does not allow disabling protection on Render", () => {
    expect(checkStagingAccess(null, { RENDER: "true", STAGING_AUTH_MODE: "off" })).toBe("unconfigured");
  });
  it("permits the explicitly local Docker demo and ordinary development", () => {
    expect(checkStagingAccess(null, { NODE_ENV: "production", STAGING_AUTH_MODE: "off" })).toBe("allowed");
    expect(checkStagingAccess(null, { NODE_ENV: "development" })).toBe("allowed");
  });
});
