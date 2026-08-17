# Aussy Ontech — Deploy na Vercel

App PWA offline-first para emergências, cobertura e satélites no Brasil.

## Deploy rápido (3 minutos)

### 1. Suba o código para o GitHub
```bash
git init && git add . && git commit -m "Aussy Ontech pronto para Vercel"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/aussy-ontech.git
git push -u origin main
```

### 2. Conecte na Vercel
1. Acesse https://vercel.com/new
2. Importe o repositório
3. Framework Preset: **Next.js** (detectado automaticamente)
4. Root Directory: `./` (padrão)
5. Build Command: `next build` (já configurado no `vercel.json`)
6. Install Command: `bun install --frozen-lockfile` (já configurado)
7. Clique em **Deploy**

### 3. Configure a variável de ambiente
No painel da Vercel → **Settings** → **Environment Variables**:
- `NEXT_PUBLIC_SITE_URL` = `https://aussy-ontech.vercel.app` (ou seu domínio customizado)

### 4. (Opcional) Domínio próprio
**Settings** → **Domains** → adicione `aussy-ontech.com.br` (ou o que tiver).

Depois de adicionar o domínio, **atualize** a env var `NEXT_PUBLIC_SITE_URL` para o domínio final — isso garante que metadata OpenGraph, Twitter Cards e canonical URLs apontem pro lugar certo.

## Build validado

- ✅ Next.js 16.3.1 (Turbopack) — sem warnings
- ✅ TypeScript strict — sem erros
- ✅ 21 rotas (1 página + 20 APIs)
- ✅ Região brasileira `gru1` (São Paulo) já configurada no `vercel.json`
- ✅ Cabeçalhos de segurança (CSP, HSTS, Permissions-Policy)
- ✅ PWA completo (manifest, service worker v7, ícones 192/512)
- ✅ Offline-first com pré-cache de 16 endpoints críticos

## O que está incluído

| Recurso | Status |
|---------|--------|
| 7 abas (Início, SOS, Natureza, Sensores, Mapa, Satélites, Info) | ✅ |
| 16 APIs brasileiras (INMET, CEMADEN, INPE, CPTEC, IBGE, ANA, SEDEC) | ✅ |
| APIs internacionais (USGS, NASA EONET) | ✅ |
| SOS emergência (192/190/193) | ✅ |
| Bússola + Altímetro + Sol (sensores iOS/Android) | ✅ |
| Fauna brasileira (15 espécies com protocolos) | ✅ |
| Mapa OpenStreetMap offline | ✅ |
| PWA instalável (iOS/Android/Windows/macOS) | ✅ |
| Service Worker v7 (estratégias por endpoint) | ✅ |
| CSP + HSTS + Permissions-Policy | ✅ |
| Acessibilidade WCAG (zoom até 5x) | ✅ |

## Desenvolvimento local
```bash
bun install
bun run dev
# http://localhost:3000
```

## Variáveis de ambiente

Apenas uma é necessária (e opcional em dev):
- `NEXT_PUBLIC_SITE_URL` — URL pública do site (usada em metadata/SEO)

Todas as APIs brasileiras consumidas são **públicas e não requerem chaves**.

## Estrutura
```
src/app/                 # App Router Next.js 16
  ├── page.tsx           # Página única com 7 abas
  ├── layout.tsx         # Metadata PWA, viewport, SW registration
  ├── globals.css        # Tailwind 4
  └── api/               # 20 rotas de API (todas com fallback offline)
src/components/aussy/    # Componentes do app
src/components/ui/       # shadcn/ui
src/lib/data/            # Dados estáticos (fauna, cobertura, emergência)
public/                  # PWA assets (manifest, sw.js, ícones)
vercel.json              # Configuração deploy (região gru1)
next.config.ts           # CSP, headers, images
```

## Licença
Uso pessoal e público permitido. APIs consumidas têm suas próprias licenças (todas públicas governamentais ou open data).
