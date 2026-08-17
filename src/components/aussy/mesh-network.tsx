'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bluetooth,
  BluetoothConnected,
  Radio,
  Send,
  Users,
  AlertCircle,
  Wifi,
  MessageSquare,
} from 'lucide-react'

interface MeshNode {
  id: string
  name: string
  rssi?: number
  lastSeen: number
}

interface MeshMessage {
  id: string
  from: string
  to: 'broadcast' | string
  text: string
  timestamp: number
  self: boolean
}

// Serviço Bluetooth Mesh custom (não é BLE Mesh padrão — é BroadcastChannel + Web Bluetooth)
const MESH_SERVICE_ID = 'aussy-ontech-mesh'

export function MeshNetwork() {
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<MeshNode[]>([])
  const [messages, setMessages] = useState<MeshMessage[]>([])
  const [input, setInput] = useState('')
  const [peerId, setPeerId] = useState<string>('')
  const channelRef = useRef<BroadcastChannel | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Gera ID único do peer
  useEffect(() => {
    const id = `peer-${Math.random().toString(36).slice(2, 8)}`
    setPeerId(id)
  }, [])

  // Tenta iniciar Web Bluetooth (apenas se disponível e habilitado)
  const enableBluetooth = async () => {
    setError(null)
    try {
      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth não suportado neste navegador. Use Chrome/Edge no Android/desktop.')
      }

      // Tenta solicitar dispositivo (requer gesto do usuário)
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access'],
      })

      // Adiciona como nó descoberto
      const newNode: MeshNode = {
        id: device.id,
        name: device.name || 'Dispositivo BLE',
        lastSeen: Date.now(),
      }
      setNodes((prev) => [...prev.filter((n) => n.id !== newNode.id), newNode])
      setEnabled(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao ativar Bluetooth')
    }
  }

  // BroadcastChannel funciona entre abas no mesmo dispositivo (mesh local)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    const channel = new BroadcastChannel(MESH_SERVICE_ID)
    channelRef.current = channel

    channel.onmessage = (event) => {
      const msg = event.data
      if (msg.type === 'hello') {
        // Novo peer entrou — responde com presença
        channel.postMessage({ type: 'present', peerId, name: `Dispositivo-${peerId.slice(-4)}` })
        setNodes((prev) => {
          if (prev.find((n) => n.id === msg.peerId)) return prev
          return [...prev, { id: msg.peerId, name: msg.name, lastSeen: Date.now() }]
        })
      } else if (msg.type === 'present') {
        setNodes((prev) => {
          if (prev.find((n) => n.id === msg.peerId)) {
            return prev.map((n) => n.id === msg.peerId ? { ...n, lastSeen: Date.now() } : n)
          }
          return [...prev, { id: msg.peerId, name: msg.name, lastSeen: Date.now() }]
        })
      } else if (msg.type === 'message') {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            from: msg.peerId,
            to: 'broadcast',
            text: msg.text,
            timestamp: Date.now(),
            self: msg.peerId === peerId,
          },
        ])
      } else if (msg.type === 'bye') {
        setNodes((prev) => prev.filter((n) => n.id !== msg.peerId))
      }
    }

    // Anuncia presença
    channel.postMessage({ type: 'hello', peerId, name: `Dispositivo-${peerId.slice(-4)}` })

    return () => {
      channel.postMessage({ type: 'bye', peerId })
      channel.close()
    }
  }, [peerId])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = () => {
    if (!input.trim() || !channelRef.current) return
    const text = input.trim()
    channelRef.current.postMessage({ type: 'message', peerId, text })
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        from: peerId,
        to: 'broadcast',
        text,
        timestamp: Date.now(),
        self: true,
      },
    ])
    setInput('')
  }

  // Remove nós inativos (>30s sem sinal)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      setNodes((prev) => prev.filter((n) => now - n.lastSeen < 30000))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const connected = nodes.length > 0
  const supported = typeof window !== 'undefined' && 'BroadcastChannel' in window
  // Estado para bluetoothSupported (evita hydration mismatch)
  const [bluetoothSupported, setBluetoothSupported] = useState(false)
  useEffect(() => {
    setBluetoothSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator)
  }, [])

  return (
    <div className="space-y-4">
      {/* Status da mesh */}
      <Card className={`glass-card ${connected ? 'border-emerald-500/40' : 'border-border/40'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {connected ? (
                <BluetoothConnected className="h-5 w-5 text-emerald-400" />
              ) : (
                <Bluetooth className="h-5 w-5 text-signal" />
              )}
              Rede Mesh Local
            </CardTitle>
            <Badge
              variant="outline"
              className={
                connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-muted/30 text-muted-foreground'
              }
            >
              {nodes.length} {nodes.length === 1 ? 'par' : 'pares'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Comunicacao entre dispositivos próximos <strong className="text-foreground">sem internet</strong> — usa Web Bluetooth e BroadcastChannel. Cada celular vira um nó da rede, retransmitindo mensagens para outros próximos.
          </p>

          {!supported && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2 text-xs text-amber-400 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Seu navegador não suporta BroadcastChannel. Use Chrome, Edge ou Firefox atualizado.</span>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              onClick={enableBluetooth}
              disabled={!bluetoothSupported}
              size="sm"
              className="flex-1"
              variant={enabled ? 'outline' : 'default'}
            >
              <Bluetooth className="h-3.5 w-3.5 mr-1.5" />
              {enabled ? 'BLE Ativado' : 'Ativar Bluetooth'}
            </Button>
            <Button
              onClick={() => {
                if (channelRef.current) {
                  channelRef.current.postMessage({ type: 'hello', peerId, name: `Dispositivo-${peerId.slice(-4)}` })
                }
              }}
              size="sm"
              variant="outline"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Anunciar
            </Button>
          </div>

          {!bluetoothSupported && (
            <p className="text-[10px] text-amber-400">
              ⚠️ Web Bluetooth não disponível. Mesh funcionará apenas entre abas/dispositivos no mesmo navegador (BroadcastChannel).
            </p>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2 rounded-md">
              {error}
            </div>
          )}

          {/* ID do peer */}
          <div className="text-xs font-mono-jet text-muted-foreground text-center">
            seu ID: <span className="text-signal">{peerId}</span>
          </div>
        </CardContent>
      </Card>

      {/* Chat mesh */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-signal" />
            Chat Mesh — Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60 mb-3">
            <div ref={scrollRef} className="space-y-2 pr-2">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-8">
                  Nenhuma mensagem ainda. Envie uma mensagem broadcast — todos os pares conectados receberão.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`text-[10px] text-muted-foreground mb-0.5 font-mono-jet ${msg.self ? 'text-right' : ''}`}>
                      {msg.self ? 'você' : msg.from.slice(-6)} · {new Date(msg.timestamp).toLocaleTimeString('pt-BR')}
                    </div>
                    <div
                      className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                        msg.self
                          ? 'bg-signal/20 text-foreground border border-signal/30'
                          : 'bg-secondary/40 text-foreground border border-border/30'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Mensagem para a rede mesh..."
              className="text-sm"
            />
            <Button onClick={sendMessage} size="sm" className="px-3">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de nós */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-orbit" />
            Dispositivos na Rede
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {nodes.length + 1}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-2 rounded-md bg-signal/10 border border-signal/30">
              <Wifi className="h-3.5 w-3.5 text-signal" />
              <span className="text-sm font-medium">Você (este dispositivo)</span>
              <span className="ml-auto text-[10px] text-muted-foreground font-mono-jet">
                {peerId}
              </span>
            </div>
            {nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/30"
              >
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-sm font-medium">{node.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono-jet">
                  há {Math.round((Date.now() - node.lastSeen) / 1000)}s
                </span>
              </div>
            ))}
            {nodes.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                Nenhum par conectado. Abra o app em outro dispositivo na mesma rede, ou ative o Bluetooth para escanear dispositivos BLE próximos.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
