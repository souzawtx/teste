#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 ou superior não foi encontrado. Instale o Node.js e tente novamente."
  echo "Depois, abra este arquivo novamente ou execute: npm start"
  read -r -p "Pressione Enter para fechar..." _
  exit 1
fi

PORT="${PORT:-4173}"
URL="http://localhost:${PORT}"

if command -v curl >/dev/null 2>&1 && curl -fsS "$URL/api/health" >/dev/null 2>&1; then
  echo "A Liga dos Leitores já está em execução em $URL"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true; fi
  exit 0
fi

echo "Iniciando a Liga dos Leitores..."
PORT="$PORT" node server.js &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

READY=0
for _ in $(seq 1 30); do
  if command -v curl >/dev/null 2>&1 && curl -fsS "$URL/api/health" >/dev/null 2>&1; then READY=1; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "Não foi possível iniciar o servidor. Confira se a porta $PORT está livre."
  exit 1
fi

echo "Site disponível em: $URL"
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true; fi
echo "Para encerrar, volte a este terminal e pressione Ctrl+C."
wait "$SERVER_PID"
