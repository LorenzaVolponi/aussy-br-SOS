#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${VERCEL_PROJECT_NAME:-aussy-br-sos}"
TEAM_SLUG="${VERCEL_TEAM_SLUG:-adm-wuazecoms-projects}"

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

max_attempts=3
attempt=1
while [[ $attempt -le $max_attempts ]]; do
  echo "[vercel-safe-deploy] Enviando artefato prebuilt (${attempt}/${max_attempts})..."
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
  if echo "$output" | grep -Eqi "rate limit|deployment rate limited|retry in|too many requests|resource is limited|try again in 24 hours|api-deployments-free-per-day"; then
    echo "[vercel-safe-deploy] Limite de deployment detectado; encerrando sem loop agressivo." >&2
    exit 75
  fi

  if [[ $attempt -lt $max_attempts ]]; then
    sleep $((attempt * 20))
  fi
  attempt=$((attempt + 1))
done

echo "[vercel-safe-deploy] Falha real ao publicar o artefato prebuilt." >&2
exit 1
