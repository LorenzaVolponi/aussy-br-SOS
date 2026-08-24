#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" || -z "${VERCEL_ORG_ID:-}" || -z "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "[vercel-safe-deploy] Vercel secrets ausentes; integração Git nativa permanece responsável pelo deploy."
  exit 0
fi

npm i -g vercel >/dev/null 2>&1
export VERCEL_ORG_ID VERCEL_PROJECT_ID

echo "[vercel-safe-deploy] Sincronizando configuração de produção..."
vercel pull --yes --environment=production --token "$VERCEL_TOKEN"

echo "[vercel-safe-deploy] Construindo artefato localmente no GitHub Actions..."
# O build acontece no runner do GitHub, não na infraestrutura de build da Vercel.
# Isso evita consumir a cota de build remoto quando a integração Git estiver rate-limited.
vercel build --prod --token "$VERCEL_TOKEN"

max_attempts=3
attempt=1
while [[ $attempt -le $max_attempts ]]; do
  echo "[vercel-safe-deploy] Enviando artefato prebuilt (${attempt}/${max_attempts})..."
  set +e
  output=$(vercel deploy --prebuilt --prod --yes --token "$VERCEL_TOKEN" 2>&1)
  code=$?
  set -e

  if [[ $code -eq 0 ]]; then
    echo "$output"
    deploy_url=$(echo "$output" | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -n1 || true)
    if [[ -n "$deploy_url" ]]; then
      echo "[vercel-safe-deploy] Smoke test em $deploy_url"
      curl --fail --silent --show-error --location --max-time 30 "$deploy_url/" >/dev/null
      curl --fail --silent --show-error --location --max-time 30 "$deploy_url/api/health" >/dev/null
    fi
    echo "[vercel-safe-deploy] Deploy prebuilt concluído."
    exit 0
  fi

  echo "$output"
  if echo "$output" | grep -Eqi "rate limit|deployment rate limited|retry in|too many requests"; then
    echo "[vercel-safe-deploy] Limite de deployment detectado; sem loop agressivo."
    exit 0
  fi

  if [[ $attempt -lt $max_attempts ]]; then
    sleep $((attempt * 20))
  fi
  attempt=$((attempt + 1))
done

echo "[vercel-safe-deploy] Falha real ao publicar o artefato prebuilt." >&2
exit 1
