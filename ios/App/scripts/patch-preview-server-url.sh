#!/bin/sh
#
# patch-preview-server-url.sh
#
# Points preview (Release-Preview) builds at the staging environment by rewriting
# `server.url` in the capacitor.config.json *inside the built .app bundle*.
#
# Why a build-phase script: Capacitor's server.url lives in a single generated
# capacitor.config.json that is shared across Xcode configurations, so Xcode build
# settings alone can't vary it per configuration. This patches the copied config in
# the build output only — it never touches the source file in git, and it leaves
# Debug/Release (production) builds completely untouched.
#
# Setup (see docs/specs/ios-preview-app.md):
#   1. Add this as a "Run Script" build phase on the App target.
#   2. Drag the phase to run AFTER "Copy Bundle Resources" (so the config is already
#      copied into the .app) and BEFORE code signing (any normal build phase is).
#   3. Script contents in Xcode: "${SRCROOT}/scripts/patch-preview-server-url.sh"
#   4. Set the staging URL below, or define a PREVIEW_SERVER_URL user-defined build
#      setting on the Release-Preview configuration (it overrides the default here).

set -eu

# Only patch preview builds. Everything else (prod, local dev) is left as-is.
if [ "${CONFIGURATION:-}" != "Release-Preview" ]; then
  echo "patch-preview-server-url: configuration is '${CONFIGURATION:-<none>}', skipping."
  exit 0
fi

# Staging URL. Override by setting a PREVIEW_SERVER_URL build setting on Release-Preview.
STAGING_URL="${PREVIEW_SERVER_URL:-https://staging.rogha.dylanwalsh.ie}"

# The capacitor.config.json copied into the built app bundle.
CONFIG="${CODESIGNING_FOLDER_PATH}/capacitor.config.json"

if [ ! -f "${CONFIG}" ]; then
  echo "error: patch-preview-server-url: config not found at ${CONFIG}" >&2
  echo "       Make sure this phase runs AFTER 'Copy Bundle Resources'." >&2
  exit 1
fi

echo "patch-preview-server-url: setting server.url = ${STAGING_URL}"
echo "                          in ${CONFIG}"

# Rewrite server.url, then force the file back to JSON (Capacitor requires JSON).
/usr/bin/plutil -replace server.url -string "${STAGING_URL}" "${CONFIG}"
/usr/bin/plutil -convert json "${CONFIG}"

echo "patch-preview-server-url: done."
