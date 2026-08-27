'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bluetooth, Radio, Send, PanelsTopLeft, AlertCircle, MessageSquare, ShieldCheck } from 'lucide-react'

interface LocalPeer { id: string; name: string; lastSeen: number }
interface LocalMessage { id: string; from: string; text: string; timestamp: number; self: boolean }

const LOCAL_CHANNEL_ID = 'aussy-ontech-local-channel'

export function MeshNetwork() {
  const [error, setError] = useState<string | null>(null)
  const [peers, setPeers] = useState<LocalPeer[]>([])
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [peerId, setPeerId] = useState('')
  const [bluetoothSupported, setBluetoothSupported] = useState(false)
  const [broadcastSupported, setBroadcastSupported] = useState(false)
  const [selectedBluetoothDevice, setSelectedBluetoothDevice] = useState<string | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPeerId(`context-${crypto.randomUUID().slice(0, 8)}`)
    setBluetoothSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator)
    setBroadcastSupported(typeof window !== 'undefined' && 'BroadcastChannel' in window)
  }, [])

  useEffect(() => {
    if (!peerId || !broadcastSupported) return

    const channel = new BroadcastChannel(LOCAL_CHANNEL_ID)
    channelRef.current = channel

    channel.onmessage = (event) => {
      const msg = event.data
      if (!msg || typeof msg !== 'object') return

      if (msg.type === 'hello') {
        channel.postMessage({ type: 'present', peerId, name: `Aussy-${peerId.slice(-4)}` })
        if (msg.peerId && msg.peerId !== peerId) {
          setPeers((current) => current.some((item) => item.id === msg.peerId)
            ? current.map((item) => item.id === msg.peerId ? { ...item, lastSeen: Date.now() } : item)
            : [...current, { id: msg.peerId, name: msg.name || 'Contexto Aussy', lastSeen: Date.now() }])
        }
      }

      if (msg.type === 'present' && msg.peerId && msg.peerId !== peerId) {
        setPeers((current) => current.some((item) => item.id === msg.peerId)
          ? current.map((item) => item.id === msg.peerId ? { ...item, lastSeen: Date.now() } : item)
          : [...current, { id: msg.peerId, name: msg.name || 'Contexto Aussy', lastSeen: Date.now() }])
      }

      if (msg.type === 'message' && msg.peerId !== peerId && typeof msg.text === 'string') {
        setMessages((current) => [...current, { id: crypto.randomUUID(), from: msg.peerId || 'contexto', text: msg.text, timestamp: Date.now(), self: false }])
      }

      if (msg.type === 'bye' && msg.peerId) setPeers((current) => current.filter((item) => item.id !== msg.peerId))
    }

    channel.postMessage({ type: 'hello', peerId, name: `Aussy-${peerId.slice(-4)}` })
    return () => {
      channel.postMessage({ type: 'bye', peerId })
      channel.close()
      channelRef.current = null
    }
  }, [peerId, broadcastSupported])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      setPeers((current) => current.filter((peer) => now - peer.lastSeen < 30000))
    }, 5000)
    return () => window.clearInterval(id)
  }, [])

  const testBluetooth = async () => {
    setError(null)
    setSelectedBluetoothDevice(null)
    try {
      if (!('bluetooth' in navigator)) throw new Error('Web Bluetooth não é exposto por este navegador.')
      const bluetooth = (navigator as unknown as { bluetooth: { requestDevice(options: { acceptAllDevices: boolean }): Promise<{ name?: string }> } }).bluetooth
      const device = await bluetooth.requestDevice({ acceptAllDevices: true })
      setSelectedBluetoothDevice(device.name || 'Dispositivo Bluetooth selecionado')
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'NotFoundError') return
      setError(cause instanceof Error ? cause.message : 'Falha ao abrir o seletor Bluetooth')
    }
  }

  const announce = () => channelRef.current?.postMessage({ type: 'hello', peerId, name: `Aussy-${peerId.slice(-4)}` })

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !channelRef.current) return
    channelRef.current.postMessage({ type: 'message', peerId, text })
    setMessages((current) => [...current, { id: crypto.randomUUID(), from: peerId, text, timestamp: Date.now(), self: true }])
    setInput('')
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div><CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50"><PanelsTopLeft className="h-5 w-5 text-blue-700 dark:text-blue-300" />Canal local experimental</CardTitle><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">Diagnóstico entre contextos Aussy abertos no mesmo ambiente de navegador.</p></div>
            <Badge variant="outline" className="border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{peers.length} contexto{peers.length === 1 ? '' : 's'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-5 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200"><ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" /><p><strong>Limite real:</strong> isto não é uma rede mesh celular‑para‑celular. BroadcastChannel comunica contextos compatíveis do mesmo site no ambiente do navegador; o teste de Bluetooth abaixo apenas abre o seletor de dispositivo e não transporta este chat.</p></div>
          {!broadcastSupported && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />BroadcastChannel não está disponível neste navegador.</div>}
          <div className="grid gap-2 sm:grid-cols-2"><Button onClick={announce} variant="outline" className="min-h-11 justify-start" disabled={!broadcastSupported}><Radio className="mr-2 h-4 w-4" />Revalidar canal local</Button><Button onClick={testBluetooth} variant="outline" className="min-h-11 justify-start" disabled={!bluetoothSupported}><Bluetooth className="mr-2 h-4 w-4" />Testar Web Bluetooth</Button></div>
          {selectedBluetoothDevice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200">Bluetooth selecionado: <strong>{selectedBluetoothDevice}</strong>. Isso confirma o seletor Web Bluetooth, não uma conexão de chat/mesh.</p>}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200">{error}</p>}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50"><MessageSquare className="h-5 w-5 text-blue-700 dark:text-blue-300" />Mensagens do canal local</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="mb-3 h-56 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"><div ref={scrollRef} className="space-y-2 p-3">{messages.length === 0 ? <div className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">Nenhuma mensagem local nesta sessão.</div> : messages.map((msg) => <div key={msg.id} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}><div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{msg.self ? 'você' : msg.from.slice(-8)} · {new Date(msg.timestamp).toLocaleTimeString('pt-BR')}</div><div className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm ${msg.self ? 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100' : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'}`}>{msg.text}</div></div>)}</div></ScrollArea>
          <div className="flex gap-2"><Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="Mensagem local..." className="min-h-11 text-base" /><Button onClick={sendMessage} className="h-11 w-11 px-0" aria-label="Enviar mensagem local" disabled={!broadcastSupported}><Send className="h-4 w-4" /></Button></div>
        </CardContent>
      </Card>

      <Card className="glass-card"><CardHeader className="pb-3"><CardTitle className="text-base text-slate-950 dark:text-slate-50">Contextos Aussy detectados</CardTitle></CardHeader><CardContent className="space-y-2"><div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200">Este contexto: <span className="font-mono">{peerId || 'iniciando…'}</span></div>{peers.map((peer) => <div key={peer.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950"><Radio className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /><span className="font-medium">{peer.name}</span><span className="ml-auto text-xs text-slate-500 dark:text-slate-400">ativo</span></div>)}{!peers.length && <p className="py-3 text-sm text-slate-600 dark:text-slate-400">Nenhum outro contexto Aussy respondeu nesta sessão.</p>}</CardContent></Card>
    </div>
  )
}
