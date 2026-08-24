# Aussy V1 — aceitação em aparelho físico

Este checklist complementa os testes automatizados. Emulação Playwright não equivale a teste em hardware real.

## iPhone / Safari
- Abrir a home em Safari e confirmar ausência de scroll horizontal.
- Autorizar e negar GPS em execuções separadas; nenhuma coordenada `0,0` deve aparecer.
- Abrir SOS, QR Local e Compartilhar; confirmar safe-area e ausência de sobreposição com a navegação inferior.
- Rotacionar portrait → landscape → portrait; navegação e conteúdo devem permanecer utilizáveis.
- Adicionar à Tela de Início, abrir em modo standalone e repetir SOS/QR.
- Colocar em modo avião após uma abertura online; confirmar shell/offline e mensagens de indisponibilidade honestas.
- Restaurar rede; confirmar recuperação sem refresh manual quando possível.

## Android / Chrome
- Repetir home, SOS, QR, GPS negado/permitido e rotação.
- Instalar PWA quando o prompt estiver disponível e testar standalone.
- Alternar Wi-Fi/dados móveis/modo avião e confirmar estado ONLINE/OFFLINE coerente.
- Testar compartilhamento nativo, SMS e WhatsApp quando instalados.

## Critérios de bloqueio
Não liberar a V1 se qualquer item abaixo ocorrer:
- localização inventada ou `0,0` apresentada como real;
- botão SOS/QR inacessível por sobreposição;
- crash sem tela de recuperação;
- loop de reload do Service Worker;
- ação de compartilhar indicar sucesso sem abrir/copy/share real;
- conteúdo crítico ilegível em viewport móvel;
- offline ser apresentado como dado ao vivo;
- posição em cache ser apresentada como GPS atual.
