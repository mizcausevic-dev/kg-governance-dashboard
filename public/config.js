// Runtime configuration. Edit this file on the deployed site to point the
// dashboard at an authenticated, redacted, same-origin read gateway without rebuilding.
//
// Leave AUDIT_STREAM_URL as the placeholder to keep the dashboard in
// demo mode (synthetic event stream so visitors can see what it does
// before configuring it). A rejected non-placeholder URL shows a config
// error and no synthetic events.
window.__KG_GOVERNANCE_CONFIG__ = {
  AUDIT_STREAM_URL: "__AUDIT_STREAM_URL__",
};
