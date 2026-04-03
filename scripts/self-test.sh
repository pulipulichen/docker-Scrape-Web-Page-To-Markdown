#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PARSER_PATH="${PARSER_PATH:-/parser}"
PARSER_URL="${BASE_URL}${PARSER_PATH}"

echo "== health =="
curl -sS -f "${BASE_URL}/health" | head -c 500
echo

echo "== GET ${PARSER_PATH} (example.com) =="
curl -sS -f -G "${PARSER_URL}" \
  --data-urlencode "url=https://example.com" \
  | head -c 2000
echo

echo "== POST ${PARSER_PATH} (example.com) =="
curl -sS -f -X POST "${PARSER_URL}" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}' \
  | head -c 2000
echo

echo "== expected error: missing url (GET ${PARSER_PATH} with no query) =="
code="$(curl -sS -o /tmp/st_m.json -w '%{http_code}' "${PARSER_URL}")"
echo "HTTP ${code}"
cat /tmp/st_m.json
echo

echo "OK"
