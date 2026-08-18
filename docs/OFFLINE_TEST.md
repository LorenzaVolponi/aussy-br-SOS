# Aussy Ontech — Matriz de validação ON/OFF

Este roteiro valida os fluxos críticos de operação online, perda de rede, cold boot offline e recuperação da conexão.

## Pré-condição

1. Abra o app online em HTTPS.
2. Em **Modo Offline & Instalação**, toque em **Preparar tudo agora**.
3. O checklist deve confirmar: Service Worker registrado/controlando, app shell + JS/CSS em cache e dados de emergência em cache.
4. Na aba **Mapa**, baixe os tiles da região que você pretende usar sem rede.

## Cenário A — online

- Home abre e navegação entre abas funciona.
- Badge mostra `ONLINE`.
- Diagnóstico de rede só apresenta IP/ISP quando a leitura é ao vivo.
- GPS real é preferido; IP é apenas fallback aproximado.
- APIs externas atualizam seus caches quando respondem com sucesso.
- SOS sonoro/vibração e links `tel:` continuam independentes das APIs.

## Cenário B — perda de rede com app aberto

1. Com o app aberto, coloque o dispositivo em modo avião.
2. O badge deve mudar para `OFFLINE`.
3. IP/ISP não devem continuar aparecendo como leitura atual.
4. Números de emergência, guias locais, SOS sonoro/vibração e dados locais continuam acessíveis.
5. A última posição válida permanece disponível com origem `cached` quando não houver nova leitura GPS/IP.
6. APIs sem cópia local retornam estado offline/indisponível; dados cacheados não podem ser apresentados como leitura ao vivo.
7. Tiles previamente baixados continuam navegáveis no mapa.

## Cenário C — cold boot offline

1. Depois de preparar o modo offline, feche completamente o navegador/PWA.
2. Ative modo avião.
3. Reabra o Aussy pela tela inicial ou URL previamente carregada.
4. A aplicação deve inicializar usando `/` + chunks `/_next/static/` do cache.
5. Navegação local, SOS, guias e recursos já cacheados devem abrir sem conexão.
6. Se o app shell nunca tiver sido preparado no dispositivo, a página mínima offline deve exibir 192, 190, 193 e 199 em vez de uma tela quebrada.

## Cenário D — OFF → ON

1. Com o app aberto offline, reative Wi‑Fi/dados móveis.
2. O badge deve voltar para `ONLINE`.
3. O evento `online` dispara atualização do app shell e pacote crítico.
4. Leituras ao vivo voltam a substituir caches somente após resposta de rede válida.
5. Atualizações do Service Worker preservam mapas OSM baixados e só eliminam caches antigos quando o novo shell + emergência estão prontos.

## Cenário E — regressão técnica

Executar antes de merge/deploy:

```bash
npm install
npm run verify:repo
npm run type-check
npm run lint
npm run build
```

`verify:repo` valida, entre outros pontos:

- sintaxe do Service Worker;
- SW v8 e app shell com chunks do Next;
- preservação de tiles OSM;
- ausência de caches manuais legados `aussy-v2-emergency`/`aussy-v2-statics`;
- ausência de `User-Agent` proibido no fetch do navegador;
- geolocalização persistente e fallback same-origin;
- ausência da antiga superfície SSRF em `/api/network/status`;
- contratos de proveniência de dados.

## Limites operacionais

Offline não transforma fontes externas em dados ao vivo. Alertas meteorológicos, ambientais, orbitais e regulatórios dependem de conexão para atualização; sem rede, o app usa somente o que foi previamente cacheado e deve identificar essa condição. Chamadas telefônicas dependem de cobertura celular/serviço da operadora, embora o discador possa ser aberto sem internet.
