#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "== health =="
curl -sS -f "${BASE_URL}/health" | head -c 500
echo

echo "== GET /api/parse (example.com) =="
curl -sS -f -G "${BASE_URL}/api/parse" \
  --data-urlencode "url=https://example.com" \
  | head -c 2000
echo

echo "== POST /api/parse (example.com) =="
curl -sS -f -X POST "${BASE_URL}/api/parse" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}' \
  | head -c 2000
echo

echo "== expected error: missing url =="
code="$(curl -sS -o /tmp/st_m.json -w '%{http_code}' "${BASE_URL}/api/parse")"
echo "HTTP ${code}"
cat /tmp/st_m.json
echo

echo "OK"
