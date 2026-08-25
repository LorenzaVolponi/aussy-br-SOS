#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${VERCEL_PROJECT_NAME:-aussy-br-sos}"
TEAM_SLUG="${VERCEL_TEAM_SLUG:-adm-wuazecoms-projects}"
DEPLOY_COOLDOWN_SECONDS="${VERCEL_DEPLOY_COOLDOWN_SECONDS:-180}"
RATE_LIMIT_BACKOFF_SECONDS="${VERCEL_RATE_LIMIT_BACKOFF_SECONDS:-180}"
MAX_ATTEMPTS="${VERCEL_DEPLOY_MAX_ATTEMPTS:-3}"

for value_name in DEPLOY_COOLDOWN_SECONDS RATE_LIMIT_BACKOFF_SECONDS MAX_ATTEMPTS; do
  value="${!value_name}"
  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "[vercel-safe-deploy] ${value_name} precisa ser um inteiro nao negativo." >&2
    exit 2
  fi
done

if [[ "$MAX_ATTEMPTS" -lt 1 ]]; then
  echo "[vercel-safe-deploy] VERCEL_DEPLOY_MAX_ATTEMPTS precisa ser >= 1." >&2
  exit 2
fi

if [[ -z "${VERCEL_TOKEN:-}" || -z "${VERCEL_ORG_ID:-}" ]]; then
  echo "[vercel-safe-deploy] VERCEL_TOKEN e VERCEL_ORG_ID sao obrigatorios." >&2
  exit 2
fi

npm i -g vercel >/dev/null 2>&1

echo "[vercel-safe-deploy] Validando projeto atual: ${PROJECT_NAME}"
node <<'NODE'
const token = process.env.VERCEL_TOKEN;
const teamId = process.env.VERCEL_ORG_ID;
const projectName = process.env.VERCEL_PROJECT_NAME || 'aussy-br-sos';
const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}?teamId=${encodeURIComponent(teamId)}`;
(async () => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  if (!response.ok) {
    console.error(`[vercel-safe-deploy] Nao foi possivel validar ${projectName}: HTTP ${response.status}`);
    console.error(text.slice(0, 1000));
    process.exit(3);
  }
  const project = JSON.parse(text);
  if (!project.id) {
    console.error('[vercel-safe-deploy] Resposta da Vercel sem project id.');
    process.exit(4);
  }
  console.log(`[vercel-safe-deploy] Projeto validado: ${project.id}`);
})().catch((error) => {
  console.error(error);
  process.exit(5);
});
NODE

rm -rf .vercel

echo "[vercel-safe-deploy] Construindo artefato de producao no GitHub Actions..."
vercel build --prod --yes --project "$PROJECT_NAME" --scope "$TEAM_SLUG" --token "$VERCEL_TOKEN"

if [[ "$DEPLOY_COOLDOWN_SECONDS" -gt 0 ]]; then
  echo "[vercel-safe-deploy] Cooldown preventivo de ${DEPLOY_COOLDOWN_SECONDS}s antes de criar deployment na Vercel."
  sleep "$DEPLOY_COOLDOWN_SECONDS"
fi

attempt=1
while [[ $attempt -le $MAX_ATTEMPTS ]]; do
  echo "[vercel-safe-deploy] Enviando artefato prebuilt (${attempt}/${MAX_ATTEMPTS})..."
  set +e
  output=$(vercel deploy --prebuilt --prod --yes --project "$PROJECT_NAME" --scope "$TEAM_SLUG" --token "$VERCEL_TOKEN" 2>&1)
  code=$?
  set -e

  if [[ $code -eq 0 ]]; then
    echo "$output"
    deploy_url=$(echo "$output" | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -n1 || true)
    if [[ -z "$deploy_url" ]]; then
      echo "[vercel-safe-deploy] Deploy concluiu, mas a URL nao foi detectada." >&2
      exit 6
    fi

    echo "[vercel-safe-deploy] Smoke test em $deploy_url"
    curl --fail --silent --show-error --location --max-time 30 "$deploy_url/" >/dev/null
    curl --fail --silent --show-error --location --max-time 30 "$deploy_url/api/health" >/dev/null
    echo "[vercel-safe-deploy] Deploy prebuilt concluido: $deploy_url"
    exit 0
  fi

  echo "$output"

  if echo "$output" | grep -Eqi "try again in 24 hours|api-deployments-free-per-day|more than 100"; then
    echo "[vercel-safe-deploy] Quota diaria de deployments detectada; nao ha retry seguro dentro desta execucao." >&2
    exit 75
  fi

  if echo "$output" | grep -Eqi "rate limit|deployment rate limited|retry in|too many requests|resource is limited|HTTP 429"; then
    if [[ $attempt -lt $MAX_ATTEMPTS ]]; then
      backoff=$((RATE_LIMIT_BACKOFF_SECONDS * attempt))
      echo "[vercel-safe-deploy] Rate limit temporario detectado; cooldown de ${backoff}s antes do proximo retry." >&2
      sleep "$backoff"
      attempt=$((attempt + 1))
      continue
    fi

    echo "[vercel-safe-deploy] Rate limit persistiu apos ${MAX_ATTEMPTS} tentativas; encerrando sem martelar a API." >&2
    exit 75
  fi

  if [[ $attempt -lt $MAX_ATTEMPTS ]]; then
    retry_wait=$((attempt * 30))
    echo "[vercel-safe-deploy] Falha transitoria; aguardando ${retry_wait}s antes do retry."
    sleep "$retry_wait"
  fi
  attempt=$((attempt + 1))
done

echo "[vercel-safe-deploy] Falha real ao publicar o artefato prebuilt." >&2
exit 1
