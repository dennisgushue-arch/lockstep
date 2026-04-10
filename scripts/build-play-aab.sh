#!/usr/bin/env bash
set -euo pipefail

# One-command Play upload AAB build using approved upload key.
# Defaults assume you've run upload-key-reset setup in this repo.
#
# Optional env vars:
#   ANDROID_KEYSTORE_PATH      (default: /workspaces/lockstep/android/signing/new-upload-key.jks)
#   ANDROID_KEY_ALIAS          (default: upload)
#   ANDROID_KEYSTORE_PASSWORD  (prompted if missing)
#   ANDROID_KEY_PASSWORD       (prompted if missing)
#
# Output:
#   /workspaces/lockstep/app-release-play-upload.aab

ROOT_DIR="/workspaces/lockstep"
ANDROID_DIR="$ROOT_DIR/android"
AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
FINAL_AAB="$ROOT_DIR/app-release-play-upload.aab"

KEYSTORE_PATH="${ANDROID_KEYSTORE_PATH:-$ROOT_DIR/android/signing/new-upload-key.jks}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-upload}"

if [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "❌ Keystore not found: $KEYSTORE_PATH"
  echo "   Set ANDROID_KEYSTORE_PATH or place key at android/signing/new-upload-key.jks"
  exit 1
fi

if [[ -z "${ANDROID_KEYSTORE_PASSWORD:-}" ]]; then
  read -rsp "Enter keystore password: " ANDROID_KEYSTORE_PASSWORD
  printf "\n"
fi

if [[ -z "${ANDROID_KEY_PASSWORD:-}" ]]; then
  read -rsp "Enter key password: " ANDROID_KEY_PASSWORD
  printf "\n"
fi

if [[ -z "$ANDROID_KEYSTORE_PASSWORD" || -z "$ANDROID_KEY_PASSWORD" ]]; then
  echo "❌ Passwords cannot be empty"
  exit 1
fi

export ANDROID_KEYSTORE_PATH="$KEYSTORE_PATH"
export ANDROID_KEYSTORE_PASSWORD
export ANDROID_KEY_ALIAS="$KEY_ALIAS"
export ANDROID_KEY_PASSWORD

echo "🔐 Building signed release AAB..."
pushd "$ANDROID_DIR" >/dev/null
./gradlew bundleRelease
popd >/dev/null

if [[ ! -f "$AAB_PATH" ]]; then
  echo "❌ AAB not found after build: $AAB_PATH"
  exit 1
fi

cp -f "$AAB_PATH" "$FINAL_AAB"

echo "🔎 Verifying signer fingerprint on final AAB..."
keytool -printcert -jarfile "$FINAL_AAB" | grep -E "SHA1:|SHA256:"

echo "\n✅ Ready to upload: $FINAL_AAB"
