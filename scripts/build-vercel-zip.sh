#!/bin/bash
# Gera o zip limpo para deploy na Vercel — apenas o necessário
set -e

cd /home/z/my-project

OUT="download/aussy-ontech-vercel-ready.zip"

# Limpa zip anterior
rm -f "$OUT"

# Cria diretório temporário limpo com apenas o necessário
TMP_DIR=$(mktemp -d)
echo "📁 Temp: $TMP_DIR"

# Lista explícita do que copiar
COPY_PATHS=(
  "src"
  "public"
  "scripts"
  "package.json"
  "next.config.ts"
  "tsconfig.json"
  "tailwind.config.ts"
  "postcss.config.mjs"
  "components.json"
  "eslint.config.mjs"
  ".gitignore"
  ".env.example"
  "vercel.json"
  "DEPLOY.md"
  "Caddyfile"
  "README.md"
)

for path in "${COPY_PATHS[@]}"; do
  if [ -e "$path" ]; then
    cp -r "$path" "$TMP_DIR/"
  fi
done

# Cria um README dentro do zip se não houver
if [ ! -f README.md ]; then
  cat > "$TMP_DIR/README.md" <<'EOF'
# Aussy Ontech

PWA offline-first de emergência, cobertura e satélites para o Brasil.

Veja DEPLOY.md para instruções de deploy na Vercel.
EOF
fi

# Gera o zip de dentro do temp dir (caminhos relativos limpos)
cd "$TMP_DIR"
zip -r "/home/z/my-project/$OUT" . -x "*/.DS_Store" "*/Thumbs.db" 2>&1 | tail -5

# Limpa temp
rm -rf "$TMP_DIR"

# Mostra resultado
echo ""
echo "✅ Zip gerado: $OUT"
du -h "/home/z/my-project/$OUT"
echo ""
echo "📊 Total de arquivos: $(unzip -l "/home/z/my-project/$OUT" | tail -1 | awk '{print $2}')"
echo ""
echo "📋 Top-level do zip:"
unzip -l "/home/z/my-project/$OUT" | awk 'NR>3 {print "  " $4}' | grep -v "^  $" | head -30
