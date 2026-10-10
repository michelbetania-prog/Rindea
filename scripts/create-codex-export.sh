#!/usr/bin/env bash
set -euo pipefail

# Creates a source ZIP and a Git bundle from the current committed revision.
# It intentionally excludes .git from the ZIP, local environment files, dependencies,
# Expo caches and Manus starter metadata. The bundle keeps the Git history separately.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-"${ROOT_DIR}/../biem-cotiza-codex-export"}"

cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Refusing to export uncommitted changes. Commit or stash them first." >&2
  exit 1
fi

REVISION="$(git rev-parse --short HEAD)"
FULL_REVISION="$(git rev-parse HEAD)"
SOURCE_DIR="${OUTPUT_DIR}/biem-cotiza"
ZIP_PATH="${OUTPUT_DIR}/biem-cotiza-codex-export-${REVISION}.zip"
BUNDLE_PATH="${OUTPUT_DIR}/biem-cotiza-${REVISION}.git.bundle"
MANIFEST_PATH="${OUTPUT_DIR}/EXPORT_MANIFEST.txt"

rm -rf "$OUTPUT_DIR"
mkdir -p "$SOURCE_DIR"

# git archive exports only tracked project files and never copies .git, node_modules
# or untracked local environment files.
git archive --format=tar --prefix="biem-cotiza/" HEAD | tar -xf - -C "$OUTPUT_DIR"
rm -f "$SOURCE_DIR/.manus-starter-init.json"

(
  cd "$OUTPUT_DIR"
  zip -qr "$ZIP_PATH" "biem-cotiza"
)

git bundle create "$BUNDLE_PATH" main

{
  echo "BIEM Cotiza Codex handoff"
  echo "Source commit: ${FULL_REVISION}"
  echo "Generated UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "Artifacts:"
  sha256sum "$ZIP_PATH" "$BUNDLE_PATH"
  echo ""
  echo "ZIP file listing:"
  unzip -Z1 "$ZIP_PATH" | sort
} > "$MANIFEST_PATH"

echo "Created: $ZIP_PATH"
echo "Created: $BUNDLE_PATH"
echo "Created: $MANIFEST_PATH"
