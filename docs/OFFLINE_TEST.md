# Aussy Ontech — Matriz de validação ON/OFF

Este roteiro valida os fluxos críticos de operação online, perda de rede, cold boot offline e recuperação da conexão.

## Pré-condição

1. Abra o app online em HTTPS.
2. Em **Modo Offline & Instalação**, toque em **Preparar tudo agora**.
3. O checklist deve confirmar: Service Worker registrado/controlando, app shell + JS/CSS em cache e dados de emergência em cache.
4. Na aba **Mapa**, navegue online apenas pelas áreas e níveis de zoom que você realmente precisa visualizar. Os tiles solicitados pela visualização podem ficar em cache. **Não existe pré-download de região no servidor padrão do OpenStreetMap.**

## Cenário A — online

- Home abre e navegação entre abas funciona.
- Badge mostra `ONLINE`.
- Diagnóstico de rede só apresenta IP/ISP quando a leitura é ao vivo.
- GPS real é preferido; IP é apenas fallback aproximado.
- APIs externas atualizam seus caches quando respondem com sucesso.
- SOS sonoro/vibração e links `tel:` continuam independentes das APIs.
- O mapa solicita somente os tiles necessários ao viewport atual e mantém atribuição visível ao OpenStreetMap.
- CEMADEN aparece como **PORTAL OFICIAL**; a build não inventa contagem automatizada de alertas.

## Cenário B — perda de rede com app aberto

1. Com o app aberto, coloque o dispositivo em modo avião.
2. O badge deve mudar para `OFFLINE`.
3. IP/ISP não devem continuar aparecendo como leitura atual.
4. Números de emergência, guias locais, SOS sonoro/vibração e dados locais continuam acessíveis.
5. A última posição válida permanece disponível com origem `cached` quando não houver nova leitura GPS/IP.
6. APIs sem cópia local retornam estado offline/indisponível; dados cacheados não podem ser apresentados como leitura ao vivo.
7. Tiles OpenStreetMap previamente **visualizados** podem reaparecer do cache; uma área nunca visualizada não deve ser baixada automaticamente nem prometida como disponível offline.
8. A referência CEMADEN offline continua deixando explícito que lista vazia **não significa ausência de alertas ativos**.

## Cenário C — cold boot offline

1. Depois de preparar o modo offline, feche completamente o navegador/PWA.
2. Ative modo avião.
3. Reabra o Aussy pela tela inicial ou URL previamente carregada.
4. A aplicação deve inicializar usando `/` + chunks `/_next/static/` do cache.
5. Navegação local, SOS, guias e recursos já cacheados devem abrir sem conexão.
6. Se o app shell nunca tiver sido preparado no dispositivo, a página mínima offline deve exibir 192, 190, 193 e 199 em vez de uma tela quebrada.
7. No mapa, somente tiles já visualizados e ainda presentes no cache podem aparecer; ausência de tile deve gerar estado explícito, não prefetch em background.
8. O cache de emergência do epoch v9 deve conter **contatos e primeiros socorros atuais** antes de caches de segurança anteriores serem removidos.

## Cenário D — OFF → ON

1. Com o app aberto offline, reative Wi‑Fi/dados móveis.
2. O badge deve voltar para `ONLINE`.
3. O evento `online` dispara atualização do app shell e pacote crítico.
4. Leituras ao vivo voltam a substituir caches somente após resposta de rede válida.
5. Atualizações do Service Worker preservam tiles OSM já visualizados. Tiles dentro da janela mínima de cache não são requisitados novamente; após a janela, a visualização online pode revalidá-los. Offline continua podendo usar a cópia local existente.
6. O `aussy-offline-modules-v9` deve reaquecer os chunks lazy após o novo epoch de segurança.

## Cenário E — regressão técnica

A suíte unificada zero-dependency pode ser executada sem instalar o projeto:

```bash
node scripts/run-safety-suite.mjs
```

Os gates individuais principais continuam disponíveis:

```bash
node scripts/verify-repo.mjs
node scripts/test-sw-runtime.mjs
node scripts/test-inmet-integrity.mjs
node scripts/test-api-trust.mjs
node scripts/test-osm-policy.mjs
node scripts/test-cemaden-safety.mjs
node scripts/test-satellite-catalog-trust.mjs
```

Com registry/dependências disponíveis, executar também:

```bash
bun install
bun run verify:repo
bun run type-check
bun run lint
bun run build
```

Quando `bun.lock` existir e estiver validado, a instalação de CI/Vercel deve passar para modo congelado (`bun install --frozen-lockfile` ou equivalente suportado pela versão Bun usada).

`verify:repo` e os gates validam, entre outros pontos:

- sintaxe e comportamento do Service Worker;
- **SW v9** e app shell com chunks do Next;
- cache de emergência v9 contendo contatos + primeiros socorros antes da remoção do epoch anterior;
- `aussy-offline-modules-v9` para reaquecer módulos lazy após o hardening;
- preservação passiva dos tiles OSM visualizados;
- ausência de prefetch/bulk download de `tile.openstreetmap.org`;
- hostname canônico `tile.openstreetmap.org` e atribuição visível no mapa;
- janela mínima de 7 dias antes de revalidar um tile armazenado quando os headers não podem ser lidos;
- ausência de caches manuais legados `aussy-v2-emergency`/`aussy-v2-statics`;
- ausência de `User-Agent` proibido no fetch do navegador;
- geolocalização persistente e fallback same-origin;
- ausência de Brasília como posição operacional padrão;
- ausência da antiga superfície SSRF em `/api/network/status`;
- CEMADEN limitado a contrato de portais oficiais, sem endpoints não documentados;
- contratos de proveniência de dados.

## Limites operacionais

Offline não transforma fontes externas em dados ao vivo. Alertas meteorológicos, ambientais, orbitais e regulatórios dependem de conexão para atualização; sem rede, o app usa somente o que foi previamente cacheado e deve identificar essa condição. Chamadas telefônicas dependem de cobertura celular/serviço da operadora, embora o discador possa ser aberto sem internet.

O CEMADEN é apresentado nesta build como referência para canais oficiais; lista vazia no contrato local não confirma ausência de alertas ativos. Consulte os portais oficiais quando houver conexão.

O servidor raster padrão do OpenStreetMap é usado somente para visualização interativa e cache dos tiles efetivamente solicitados pela navegação. Pacotes completos de mapas offline exigem um provedor que autorize prefetch/offline ou infraestrutura própria de tiles.
