#!/usr/bin/env bash
# deploy/build_lambda.sh
# Packages AquaTwin Lambda backend into lambda_package.zip
# Strictly excludes all .env files and local secrets.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build_lambda"
ZIP_FILE="$ROOT_DIR/deploy/lambda_package.zip"

echo "=========================================="
echo "  Building AquaTwin Lambda Package"
echo "=========================================="

rm -rf "$BUILD_DIR" "$ZIP_FILE"
mkdir -p "$BUILD_DIR"

echo "Copying application modules..."
cp -r "$ROOT_DIR/agent" "$BUILD_DIR/"
cp -r "$ROOT_DIR/cedar" "$BUILD_DIR/"
cp -r "$ROOT_DIR/routing" "$BUILD_DIR/"
cp "$ROOT_DIR/deploy/lambda_handler.py" "$BUILD_DIR/"

mkdir -p "$BUILD_DIR/prep/out"
cp "$ROOT_DIR/prep/out/stats.json" "$BUILD_DIR/prep/out/" 2>/dev/null || true
cp "$ROOT_DIR/prep/out/places.json" "$BUILD_DIR/prep/out/" 2>/dev/null || true
cp "$ROOT_DIR/prep/out/routing_params.json" "$BUILD_DIR/prep/out/" 2>/dev/null || true
cp "$ROOT_DIR/prep/out/demo_segments.json" "$BUILD_DIR/prep/out/" 2>/dev/null || true
cp "$ROOT_DIR/prep/out/roads_scored.json" "$BUILD_DIR/prep/out/" 2>/dev/null || true

echo "Sanitizing build directory (strictly excluding secrets and caches)..."
find "$BUILD_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "$BUILD_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$BUILD_DIR" -name ".env*" -delete 2>/dev/null || true
find "$BUILD_DIR" -name "*.npz" -delete 2>/dev/null || true

# Explicit check: fail immediately if any .env slipped through
if ls "$BUILD_DIR"/.env* 1> /dev/null 2>&1; then
    echo "ERROR: .env file detected in build directory! Aborting."
    exit 1
fi

echo "Creating Lambda zip package..."
cd "$BUILD_DIR"
zip -r "$ZIP_FILE" . -x "*.env*" -x "*.npz" -x "*__pycache__*"

echo "v lambda_package.zip created successfully ($ZIP_FILE)"
rm -rf "$BUILD_DIR"
