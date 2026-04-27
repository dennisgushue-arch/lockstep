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
#   EXPECTED_UPLOAD_SHA1       (default: current Play Console upload certificate)
#
# Output:
#   /workspaces/lockstep/app-release-play-upload.aab

ROOT_DIR="/workspaces/lockstep"
ANDROID_DIR="$ROOT_DIR/android"
AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
FINAL_AAB="$ROOT_DIR/app-release-play-upload.aab"

if [[ -d "/usr/lib/jvm/java-21-openjdk-amd64" ]]; then
  export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
MAPPING_SRC="$ANDROID_DIR/app/build/outputs/mapping/release/mapping.txt"
MAPPING_ARTIFACT_DIR="$ROOT_DIR/release-artifacts/android"
MAPPING_ARTIFACT="$MAPPING_ARTIFACT_DIR/mapping-release.txt"

KEYSTORE_PATH="${ANDROID_KEYSTORE_PATH:-$ROOT_DIR/android/signing/new-upload-key.jks}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-upload}"
EXPECTED_UPLOAD_SHA1="${EXPECTED_UPLOAD_SHA1:-21:A3:E7:FF:FC:12:4D:6C:6E:85:C5:D6:38:AA:3F:F3:A7:D9:32:08}"
MIN_PLAY_VERSION_CODE="${MIN_PLAY_VERSION_CODE:-197915590}"
if [[ -z "${ANDROID_VERSION_CODE:-}" ]]; then
  NOW_EPOCH=$(date +%s)
  ANDROID_VERSION_CODE=$(( NOW_EPOCH - 1577836800 ))
  if (( ANDROID_VERSION_CODE < MIN_PLAY_VERSION_CODE )); then
    ANDROID_VERSION_CODE=$MIN_PLAY_VERSION_CODE
  fi
fi
ANDROID_VERSION_NAME="${ANDROID_VERSION_NAME:-1.0.${ANDROID_VERSION_CODE}}"

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

ACTUAL_SHA1=$(keytool -list -v -keystore "$KEYSTORE_PATH" -storepass "$ANDROID_KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" \
  | awk -F': ' '/SHA1:/ {print $2; exit}')

if [[ -z "$ACTUAL_SHA1" ]]; then
  echo "❌ Could not read SHA1 from keystore/alias."
  exit 1
fi

echo "Expected SHA1: $EXPECTED_UPLOAD_SHA1"
echo "Actual SHA1:   $ACTUAL_SHA1"

if [[ "$ACTUAL_SHA1" != "$EXPECTED_UPLOAD_SHA1" ]]; then
  echo "❌ Upload key fingerprint mismatch. Refusing to build to avoid another rejected upload."
  exit 1
fi

export ANDROID_KEYSTORE_PATH="$KEYSTORE_PATH"
export ANDROID_KEYSTORE_PASSWORD
export ANDROID_KEY_ALIAS="$KEY_ALIAS"
export ANDROID_KEY_PASSWORD
export ANDROID_VERSION_CODE
export ANDROID_VERSION_NAME

echo "Using Android versionCode: $ANDROID_VERSION_CODE"
echo "Using Android versionName: $ANDROID_VERSION_NAME"

echo "🔐 Building signed release AAB..."
pushd "$ANDROID_DIR" >/dev/null
./gradlew bundleRelease
popd >/dev/null

if [[ ! -f "$AAB_PATH" ]]; then
  echo "❌ AAB not found after build: $AAB_PATH"
  exit 1
fi

if [[ ! -f "$MAPPING_SRC" ]]; then
  echo "❌ mapping.txt not found after build: $MAPPING_SRC"
  echo "   Ensure release minification is enabled (R8/proguard)"
  exit 1
fi

cp -f "$AAB_PATH" "$FINAL_AAB"
mkdir -p "$MAPPING_ARTIFACT_DIR"
cp -f "$MAPPING_SRC" "$MAPPING_ARTIFACT"

echo "🔎 Verifying signer fingerprint on final AAB..."
keytool -printcert -jarfile "$FINAL_AAB" | grep -E "SHA1:|SHA256:"

AAB_SHA1=$(keytool -printcert -jarfile "$FINAL_AAB" | awk -F': ' '/SHA1:/ {print $2; exit}')
if [[ "$AAB_SHA1" != "$EXPECTED_UPLOAD_SHA1" ]]; then
  echo "❌ Final AAB signer fingerprint mismatch."
  exit 1
fi

echo "\n✅ Ready to upload: $FINAL_AAB"
echo "🧩 Deobfuscation file: $MAPPING_ARTIFACT"
