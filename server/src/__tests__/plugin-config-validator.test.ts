import { describe, expect, it } from "vitest";
import { validateInstanceConfig } from "../services/plugin-config-validator.js";

describe("plugin settings schema annotations", () => {
  const schema = {
    type: "object",
    "x-paperclip-setup": { instructions: ["Create an OAuth client"] },
    properties: {
      publicOrigin: { type: "string", format: "uri", "x-paperclip-order": 3, "x-paperclip-advanced": true, "x-paperclip-group": "Hosting" },
      clientId: {
        type: "object", format: "secret-ref", "x-paperclip-secret-name": "GTM_CLIP_GOOGLE_CLIENT_ID", "x-paperclip-order": 1,
        required: ["type", "secretId"],
        properties: { type: { const: "secret_ref" }, secretId: { type: "string", format: "uuid" } },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  };

  it("accepts supported display hints without throwing a settings HTTP 500", () => {
    expect(validateInstanceConfig({ publicOrigin: "https://www.allencap.co/", clientId: { type: "secret_ref", secretId: "00000000-0000-4000-8000-000000000001" } }, schema)).toEqual({ valid: true });
  });

  it("still validates URLs and secret payloads", () => {
    expect(validateInstanceConfig({ publicOrigin: "invalid" }, schema)).toMatchObject({ valid: false, errors: [{ field: "/publicOrigin", message: expect.any(String) }] });
    expect(validateInstanceConfig({ clientId: "raw-value" }, schema)).toMatchObject({ valid: false });
  });

  it("does not disable strict validation for unknown schema keywords", () => {
    expect(() => validateInstanceConfig({}, { type: "object", "misspelled-keyword": true })).toThrow(/unknown keyword/);
  });
});
