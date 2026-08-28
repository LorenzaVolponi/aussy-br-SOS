#!/usr/bin/env bash
set -euo pipefail

COOLDOWN_MINUTES="${VERCEL_DEPLOY_COOLDOWN_MINUTES:-60}"
WORKFLOW_FILE="${VERCEL_DEPLOY_WORKFLOW_FILE:-vercel-deploy.yml}"

if ! [[ "$COOLDOWN_MINUTES" =~ ^[0-9]+$ ]]; then
  echo "[vercel-cooldown] VERCEL_DEPLOY_COOLDOWN_MINUTES precisa ser inteiro nao negativo." >&2
  exit 2
fi

if [[ -z "${GITHUB_TOKEN:-}" || -z "${GITHUB_REPOSITORY:-}" ]]; then
  echo "[vercel-cooldown] Contexto GitHub ausente. Seguindo sem cooldown."
  exit 0
fi

api_url="https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&per_page=1"
json=$(curl -fsSL \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "$api_url")

last_time=$(python - <<'PY' "$json"
import json, sys
obj = json.loads(sys.argv[1])
runs = obj.get('workflow_runs', [])
print(runs[0]['updated_at'] if runs else '')
PY
)

if [[ -z "$last_time" ]]; then
  echo "[vercel-cooldown] Sem deploy de producao anterior. Deploy permitido."
  exit 0
fi

now_epoch=$(date -u +%s)
last_epoch=$(date -u -d "$last_time" +%s)
diff_min=$(( (now_epoch - last_epoch) / 60 ))

if (( diff_min < COOLDOWN_MINUTES )); then
  echo "[vercel-cooldown] Cooldown ativo (${diff_min}m < ${COOLDOWN_MINUTES}m). Pulando novo deployment para proteger a quota."
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "### Vercel deployment lock"
      echo "- Status: pulado por cooldown"
      echo "- Janela: ${COOLDOWN_MINUTES} minutos"
      echo "- Ultimo deploy de producao bem-sucedido: ${diff_min} minutos atras"
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 78
fi

echo "[vercel-cooldown] Cooldown liberado (${diff_min}m >= ${COOLDOWN_MINUTES}m)."
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "### Vercel deployment lock"
    echo "- Status: deploy permitido"
    echo "- Janela: ${COOLDOWN_MINUTES} minutos"
    echo "- Ultimo deploy de producao bem-sucedido: ${diff_min} minutos atras"
  } >> "$GITHUB_STEP_SUMMARY"
fi
