#!/usr/bin/env bash
set -euo pipefail

# Generates a NEW upload keystore + PEM certificate for Google Play upload key reset.
# Usage:
#   ./scripts/generate-upload-key-reset-artifacts.sh
# Then submit the generated PEM file in Play Console upload key reset flow.

OUT_DIR="/workspaces/lockstep/android/signing"
KEYSTORE_PATH="$OUT_DIR/new-upload-key.jks"
PEM_PATH="$OUT_DIR/new-upload-cert.pem"
ALIAS="upload"
VALIDITY_DAYS=10000

mkdir -p "$OUT_DIR"

if [[ -f "$KEYSTORE_PATH" ]]; then
  echo "❌ Keystore already exists at $KEYSTORE_PATH"
  echo "   Delete it first if you want to regenerate."
  exit 1
fi

read -rsp "Enter keystore password: " STORE_PASS
printf "\n"
read -rsp "Enter key password (can be same): " KEY_PASS
printf "\n"

if [[ -z "$STORE_PASS" || -z "$KEY_PASS" ]]; then
  echo "❌ Passwords cannot be empty."
  exit 1
fi

echo "🔐 Generating new upload keystore..."
keytool -genkeypair -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=Lockstep Upload Key, OU=Mobile, O=Lockstep, L=City, ST=State, C=US"

echo "📄 Exporting PEM certificate for Play Console..."
keytool -export -rfc \
  -keystore "$KEYSTORE_PATH" \
  -alias "$ALIAS" \
  -file "$PEM_PATH" \
  -storepass "$STORE_PASS"

echo "\n✅ Generated artifacts:"
echo "- Keystore: $KEYSTORE_PATH"
echo "- Certificate PEM: $PEM_PATH"

echo "\n🔎 Fingerprints (for your records):"
keytool -list -v -keystore "$KEYSTORE_PATH" -alias "$ALIAS" -storepass "$STORE_PASS" | grep -E "SHA1:|SHA256:"

echo "\nNext:"
echo "1) In Play Console: App integrity → App signing → Request upload key reset"
echo "2) Upload PEM file: $PEM_PATH"
echo "3) After Google approves reset, use this keystore for all future uploads"

echo "\n⚠️ Save these securely (password manager):"
echo "- Keystore path: $KEYSTORE_PATH"
echo "- Alias: $ALIAS"
echo "- Keystore password"
echo "- Key password"
