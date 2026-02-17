#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
VALIDATE="$PROJECT_DIR/scripts/validate.js"
BUILD="$PROJECT_DIR/scripts/build.js"

OPEN_FLAG=false
RENDER_FLAG=false
FIXTURES=()

# Parse args
for arg in "$@"; do
  case "$arg" in
    --open)   OPEN_FLAG=true ;;
    --render) RENDER_FLAG=true ;;
    *)        FIXTURES+=("$arg") ;;
  esac
done

# Default to all fixtures if none specified
if [ ${#FIXTURES[@]} -eq 0 ]; then
  for f in "$FIXTURES_DIR"/*.json; do
    FIXTURES+=("$(basename "$f" .json)")
  done
fi

PASS=0
FAIL=0
OUTPUTS=()

for name in "${FIXTURES[@]}"; do
  json="$FIXTURES_DIR/$name.json"
  out="$SCRIPT_DIR/$name.html"

  if [ ! -f "$json" ]; then
    echo "SKIP  $name — fixture not found"
    continue
  fi

  printf "%-30s" "$name"

  # Validate
  if ! node "$VALIDATE" "$json" 2>&1; then
    echo "  FAIL (validation)"
    FAIL=$((FAIL + 1))
    continue
  fi

  # Build
  if ! node "$BUILD" --data "$json" --out "$out" > /dev/null 2>&1; then
    echo "  FAIL (build)"
    FAIL=$((FAIL + 1))
    continue
  fi

  echo "  OK → $out"
  PASS=$((PASS + 1))
  OUTPUTS+=("$out")
done

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$RENDER_FLAG" = true ] && [ ${#OUTPUTS[@]} -gt 0 ]; then
  echo "Running render tests..."
  echo ""
  RENDER_NAMES=()
  for out in "${OUTPUTS[@]}"; do
    RENDER_NAMES+=("$(basename "$out" .html)")
  done
  if ! node "$SCRIPT_DIR/render-test.js" "${RENDER_NAMES[@]}"; then
    FAIL=$((FAIL + 1))
  fi
fi

if [ "$OPEN_FLAG" = true ] && [ ${#OUTPUTS[@]} -gt 0 ]; then
  echo "Opening in browser..."
  for out in "${OUTPUTS[@]}"; do
    open "$out"
  done
fi

exit $FAIL
