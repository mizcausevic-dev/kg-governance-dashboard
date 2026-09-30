import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// This workflow deploys a synthetic demo only. Reject an existing or built
// live config so a demo sync cannot silently replace a connected site.
export function isDemoConfig(text) {
  // Whitelist the full runtime assignment. A placeholder line followed by a
  // second statement that turns on live mode is not a demo configuration.
  const code = text.replace(/^\s*\/\/[^\r\n]*(?:\r?\n|$)/gm, "").trim();
  return /^window\.__KG_GOVERNANCE_CONFIG__\s*=\s*\{\s*AUDIT_STREAM_URL\s*:\s*(["'])__AUDIT_STREAM_URL__\1\s*,?\s*\}\s*;?$/.test(code);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("FAIL: provide at least one config.js path");
    process.exitCode = 2;
  }
  for (const file of files) {
    try {
      if (!isDemoConfig(readFileSync(file, "utf8"))) {
        console.error(`FAIL: ${file} is not a synthetic-demo config`);
        process.exitCode = 1;
      } else {
        console.log(`OK: ${file} is a synthetic-demo config`);
      }
    } catch (error) {
      console.error(`FAIL: ${file}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}
