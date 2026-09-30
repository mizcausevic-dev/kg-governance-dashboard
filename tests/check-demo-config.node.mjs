import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isDemoConfig } from "../scripts/check-demo-config.mjs";

test("repository runtime config is explicitly synthetic demo", () => {
  assert.equal(isDemoConfig(readFileSync(new URL("../public/config.js", import.meta.url), "utf8")), true);
});

test("configured live or ambiguous URL is rejected for demo deployment", () => {
  assert.equal(isDemoConfig('window.__KG_GOVERNANCE_CONFIG__ = {\n  AUDIT_STREAM_URL: "/audit-stream",\n};'), false);
  assert.equal(isDemoConfig('AUDIT_STREAM_URL: "__AUDIT_STREAM_URL__"\nAUDIT_STREAM_URL: "/audit-stream"'), false);
  assert.equal(isDemoConfig('window.__KG_GOVERNANCE_CONFIG__ = { AUDIT_STREAM_URL: "__AUDIT_STREAM_URL__" };\nwindow.__KG_GOVERNANCE_CONFIG__.AUDIT_STREAM_URL = "/audit-stream";'), false);
  assert.equal(isDemoConfig("// no stream assignment"), false);
});
