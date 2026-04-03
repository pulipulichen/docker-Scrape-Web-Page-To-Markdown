#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

if [ -z "$(sudo docker compose ps app --status running -q 2>/dev/null || true)" ]; then
  echo "Docker Compose is not running; starting…"
  sudo docker compose up -d --build
  for _ in $(seq 1 60); do
    if curl -sf "${BASE_URL}/health" >/dev/null; then
      break
    fi
    sleep 1
  done
  if ! curl -sf "${BASE_URL}/health" >/dev/null; then
    echo "Service failed to become ready in time" >&2
    exit 1
  fi
fi

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

sudo docker compose down