#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Błąd: Node.js nie jest zainstalowany lub nie znajduje się w PATH." >&2
  exit 1
fi

PORT="${PORT:-4173}"
APP_URL="http://localhost:${PORT}"

cleanup() {
  trap - EXIT INT TERM

  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 &
  elif command -v gio >/dev/null 2>&1; then
    gio open "$APP_URL" >/dev/null 2>&1 &
  else
    echo "Nie znaleziono programu do automatycznego otwarcia przeglądarki." >&2
    echo "Otwórz ręcznie: $APP_URL" >&2
  fi
}

trap cleanup EXIT INT TERM

echo "Uruchamiam MAPA 101 pod adresem $APP_URL"
node server.js &
SERVER_PID=$!

for ((attempt = 1; attempt <= 100; attempt += 1)); do
  if node -e "fetch(process.argv[1]).then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))" "$APP_URL" >/dev/null 2>&1; then
    echo "Aplikacja jest gotowa. Otwieram przeglądarkę…"
    open_browser
    wait "$SERVER_PID"
    exit $?
  fi

  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    if wait "$SERVER_PID"; then
      status=0
    else
      status=$?
    fi
    echo "Błąd: nie udało się uruchomić serwera." >&2
    exit "$status"
  fi

  sleep 0.1
done

echo "Błąd: serwer nie odpowiedział pod adresem $APP_URL." >&2
exit 1