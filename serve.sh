#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8080}"
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Serving learning-stuff at http://localhost:$PORT"
echo "  e.g. http://localhost:$PORT/data-science/difference-in-differences/explore.html"
echo "  Ctrl+C to stop"
echo ""

cd "$REPO_ROOT"
python3 -m http.server "$PORT"
