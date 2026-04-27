#!/usr/bin/env bash
set -euo pipefail

# Option A: Build with EXISTING Google Play upload key
# Required env vars:
#   ANDROID_KEYSTORE_PATH
#   ANDROID_KEYSTORE_PASSWORD
#   ANDROID_KEY_ALIAS
#   ANDROID_KEY_PASSWORD
# Optional:
#   EXPECTED_UPLOAD_SHA1 (defaults to current Play expectation)

EXPECTED_UPLOAD_SHA1="${EXPECTED_UPLOAD_SHA1:-21:A3:E7:FF:FC:12:4D:6C:6E:85:C5:D6:38:AA:3F:F3:A7:D9:32:08}"

if [[ -d "/usr/lib/jvm/java-21-openjdk-amd64" ]]; then
  export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

required=(
  ANDROID_KEYSTORE_PATH
  ANDROID_KEYSTORE_PASSWORD
  ANDROID_KEY_ALIAS
  ANDROID_KEY_PASSWORD
)

for v in "${required[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "❌ Missing required env var: $v"
    exit 1
  fi
done

if [[ ! -f "$ANDROID_KEYSTORE_PATH" ]]; then
  echo "❌ Keystore file not found: $ANDROID_KEYSTORE_PATH"
  exit 1
fi

echo "🔎 Verifying upload key fingerprint..."
ACTUAL_SHA1=$(keytool -list -v -keystore "$ANDROID_KEYSTORE_PATH" -storepass "$ANDROID_KEYSTORE_PASSWORD" -alias "$ANDROID_KEY_ALIAS" \
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

echo "✅ Fingerprint matches Play expected upload key. Building signed AAB..."

pushd /workspaces/lockstep/android >/dev/null
./gradlew bundleRelease
popd >/dev/null

AAB_PATH="/workspaces/lockstep/android/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -f "$AAB_PATH" ]]; then
  echo "❌ Build finished but AAB not found at: $AAB_PATH"
  exit 1
fi

echo "🔎 Verifying AAB signer fingerprint..."
AAB_SHA1=$(keytool -printcert -jarfile "$AAB_PATH" | awk -F': ' '/SHA1:/ {print $2; exit}')

echo "AAB SHA1:      $AAB_SHA1"
echo "Expected SHA1: $EXPECTED_UPLOAD_SHA1"

if [[ "$AAB_SHA1" != "$EXPECTED_UPLOAD_SHA1" ]]; then
  echo "❌ Built AAB signer does not match expected upload key."
  exit 1
fi

echo "✅ Success. Signed AAB ready: $AAB_PATH"
