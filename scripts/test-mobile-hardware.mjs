import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function assertContains(source, pattern, label) {
  const passed = typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source)
  if (!passed) throw new Error(`Contrato ausente: ${label}`)
}

function assertNotContains(source, pattern, label) {
  const failed = typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source)
  if (failed) throw new Error(`Contrato inseguro encontrado: ${label}`)
}

const nextConfig = read('next.config.ts')
const layout = read('src/app/layout.tsx')
const page = read('src/app/page.tsx')
const geolocation = read('src/hooks/use-geolocation.ts')
const torch = read('src/components/aussy/device-torch.tsx')
const locationControl = read('src/components/aussy/location-control.tsx')

assertContains(nextConfig, 'camera=(self)', 'HTTP Permissions-Policy permite câmera apenas no próprio origin')
assertNotContains(nextConfig, 'camera=()', 'HTTP Permissions-Policy não pode bloquear a lanterna')
assertContains(layout, 'camera=(self)', 'metadata de permissão permanece alinhada ao header')
assertNotContains(layout, 'camera=()', 'layout não reintroduz bloqueio total da câmera')

assertContains(torch, 'navigator.mediaDevices.getUserMedia', 'lanterna solicita hardware via getUserMedia')
assertContains(torch, 'getCapabilities', 'lanterna verifica capability torch')
assertContains(torch, 'applyConstraints', 'lanterna controla LED por constraints')
assertContains(torch, /torch:\s*true/, 'lanterna possui acionamento explícito do LED')
assertContains(torch, /torch:\s*false/, 'lanterna possui desligamento explícito do LED')
assertContains(torch, "getTracks().forEach((track) => track.stop())", 'todas as tracks são encerradas')
assertContains(torch, 'playsInline', 'stream auxiliar é compatível com navegadores móveis')
assertContains(torch, "window.addEventListener('pagehide'", 'hardware é liberado ao sair da página')
assertContains(torch, "document.addEventListener('visibilitychange'", 'hardware é liberado ao colocar o app em segundo plano')
assertNotContains(torch, 'bg-white fixed inset-0', 'lanterna real não pode fingir LED usando tela branca')

assertContains(geolocation, 'watchPosition', 'GPS coleta múltiplos fixes')
assertContains(geolocation, 'clearWatch', 'watch GPS é encerrado')
assertContains(geolocation, /maximumAge:\s*0/, 'solicitação GPS exige fix fresco')
assertContains(geolocation, 'enableHighAccuracy: true', 'GPS solicita alta precisão')
assertContains(geolocation, "navigator.permissions.query", 'estado da permissão é observado')
assertContains(geolocation, 'GeolocationPermissionDenied', 'erros GPS são normalizados por código')
assertContains(geolocation, 'GPS_TARGET_ACCURACY_METERS', 'melhor fix é selecionado por precisão')

assertContains(page, 'MOBILE_TABS.map', 'todos os módulos móveis são navegáveis diretamente')
assertContains(page, 'overflow-x-auto', 'barra inferior suporta navegação horizontal')
assertContains(page, 'aria-current', 'aba ativa é anunciada para acessibilidade')
assertContains(page, '<DeviceTorch />', 'lanterna real aparece antes das ferramentas visuais')
assertContains(page, 'o controle acima acende o LED traseiro real', 'interface separa LED real de sinalização de tela')
assertContains(page, '<LocationControl', 'controle confiável de localização aparece no mapa')
assertNotContains(page, 'MoreHorizontal', 'mobile não depende mais do botão lateral/mais')

assertContains(locationControl, 'GPS DO APARELHO', 'interface diferencia GPS real')
assertContains(locationControl, 'REDE APROXIMADA', 'interface diferencia estimativa por rede')
assertContains(locationControl, 'POSIÇÃO SALVA', 'interface diferencia cache local')

console.log('Mobile hardware contracts: OK')
