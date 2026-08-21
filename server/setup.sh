#!/bin/sh
# Downloads the pinned PocketBase build for this machine. The version lives in
# .pb-version and nowhere else, so an upgrade is one line and the Dockerfile follows.
set -e

cd "$(dirname "$0")"
VERSION=$(tr -d ' \t\r\n' < .pb-version)

case "$(uname -s)" in
  Linux)  OS=linux ;;
  Darwin) OS=darwin ;;
  MINGW*|MSYS*|CYGWIN*) OS=windows ;;
  *) echo "Unsupported OS: $(uname -s). Download it by hand from the releases page." >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) ARCH=amd64 ;;
  arm64|aarch64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)." >&2; exit 1 ;;
esac

ASSET="pocketbase_${VERSION}_${OS}_${ARCH}.zip"
URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/${ASSET}"

echo "Fetching $ASSET"
curl -fsSL -o "$ASSET" "$URL"

# -o overwrites: re-running this is how you upgrade.
unzip -qo "$ASSET" pocketbase pocketbase.exe 2>/dev/null || unzip -qo "$ASSET"
rm -f "$ASSET" CHANGELOG.md LICENSE.md
chmod +x pocketbase 2>/dev/null || true

echo "PocketBase $VERSION is ready. Next:"
echo "  ./pocketbase serve --publicDir=.."
echo "  ./pocketbase superuser create you@example.com yourpassword"
