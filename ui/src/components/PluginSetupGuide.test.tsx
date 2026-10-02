// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { countSetupCredentials, getPluginSetup, setupCallbackUrl, type PluginSetup } from "./PluginSetupGuide";

const setup: PluginSetup = {
  instructions: ["Create your OAuth client"],
  links: [{ label: "Google Cloud", url: "https://console.cloud.google.com/auth/clients" }],
  callbackRoute: "gtm/mailbox", originField: "publicOrigin",
  credentialFields: ["googleClientId", "googleClientSecret"], continueLabel: "Open mailbox",
};
const schema = { properties: { googleClientId: { format: "secret-ref" }, googleClientSecret: { format: "secret-ref" } }, "x-paperclip-setup": setup };

describe("plugin OAuth setup", () => {
  it("builds the exact mailbox redirect for public and local installations", () => {
    expect(setupCallbackUrl(setup, { publicOrigin: "https://www.allencap.co/" }, "JOB", "http://localhost:3100")).toBe("https://www.allencap.co/JOB/gtm/mailbox");
    expect(setupCallbackUrl(setup, {}, "JOB", "http://localhost:3100")).toBe("http://localhost:3100/JOB/gtm/mailbox");
    expect(setupCallbackUrl(setup, { publicOrigin: "not-a-url" }, "JOB", "http://localhost:3100")).toBeNull();
    expect(setupCallbackUrl(setup, {}, null, "http://localhost:3100")).toBeNull();
  });

  it("counts actual saved references, without treating raw values as configured", () => {
    expect(countSetupCredentials(setup, {})).toBe(0);
    expect(countSetupCredentials(setup, { googleClientId: { type: "secret_ref", secretId: "id" }, googleClientSecret: "raw-credential" })).toBe(1);
  });

  it("ignores malformed or unsafe setup metadata", () => {
    expect(getPluginSetup(schema)).toEqual(setup);
    expect(getPluginSetup({ ...schema, "x-paperclip-setup": { ...setup, callbackRoute: "//evil.example" } })).toBeNull();
    expect(getPluginSetup({ ...schema, "x-paperclip-setup": { ...setup, links: [{ label: "Bad", url: "javascript:alert(1)" }] } })).toBeNull();
  });
});
