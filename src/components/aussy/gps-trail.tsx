'use client'

import { useEffect, useState } from 'react'
import {
  MapPin,
  Plus,
  Trash2,
  Route,
  Clock,
  Share2,
  Download,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'

interface TrailPoint {
  id: string
  lat: number
  lon: number
  accuracy?: number
  source: string
  label?: string
  timestamp: string
}

const DB_NAME = 'aussy-offline'
const DB_VERSION = 1
const STORE = 'gps-trail'
const MAX_POINTS = 50

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function listTrail(): Promise<TrailPoint[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const all = (req.result as TrailPoint[]) || []
      // Ordena por timestamp DESC (mais novo primeiro)
      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      resolve(all)
    }
    req.onerror = () => reject(req.error)
  })
}

async function savePoint(p: TrailPoint): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(p)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function deletePoint(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function clearTrail(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Trilha GPS — salva posições no aparelho (IndexedDB) para equipes de resgate.
 * Útil em situações de caminhada/trilha/off-road onde você pode se perder.
 * Cada ponto mostra: coordenadas, precisão, horário e label opcional.
 * Pode exportar como texto/Google Maps URL ou compartilhar.
 */
export function GpsTrail() {
  const [trail, setTrail] = useState<TrailPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLabelInput, setShowLabelInput] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const { point, detect, loading: geoLoading } = useGeolocation()

  const refresh = async () => {
    try {
      const list = await listTrail()
      setTrail(list)
    } catch (e) {
      console.error('Erro carregando trilha:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleSaveCurrent = async () => {
    let p = point
    if (!p) {
      setSaving(true)
      try {
        await detect(true)
        return // o useEffect do useGeolocation vai atualizar point; usuário clica de novo
      } catch (e) {
        toast.error('Não foi possível obter GPS')
        return
      } finally {
        setSaving(false)
      }
    }
    if (!p) {
      toast.error('GPS indisponível')
      return
    }
    const newPoint: TrailPoint = {
      id: `trail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lat: p.lat,
      lon: p.lon,
      accuracy: p.accuracy,
      source: p.source,
      timestamp: new Date().toISOString(),
    }
    try {
      await savePoint(newPoint)
      toast.success('Posição salva na trilha', {
        description: `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`,
      })
      refresh()
    } catch (e) {
      toast.error('Erro ao salvar posição')
    }
  }

  const handleSaveWithLabel = async (id?: string) => {
    if (!label.trim()) {
      toast.error('Digite um nome para o ponto')
      return
    }
    // Se id foi passado, atualiza; senão, cria novo com label
    if (id) {
      const existing = trail.find((t) => t.id === id)
      if (existing) {
        await savePoint({ ...existing, label: label.trim() })
        toast.success('Ponto renomeado')
        setShowLabelInput(null)
        setLabel('')
        refresh()
        return
      }
    }
    // Novo ponto com label
    let p = point
    if (!p) {
      try {
        await detect(true)
      } catch (e) {
        toast.error('GPS indisponível')
        return
      }
    }
    if (!point) {
      toast.error('Aguardando GPS — tente novamente')
      return
    }
    const newPoint: TrailPoint = {
      id: `trail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lat: point.lat,
      lon: point.lon,
      accuracy: point.accuracy,
      source: point.source,
      label: label.trim(),
      timestamp: new Date().toISOString(),
    }
    await savePoint(newPoint)
    toast.success(`Ponto "${label}" salvo`)
    setShowLabelInput(null)
    setLabel('')
    refresh()
  }

  const handleDelete = async (id: string) => {
    await deletePoint(id)
    toast.success('Ponto removido')
    refresh()
  }

  const handleClearAll = async () => {
    if (!confirm(`Apagar todos os ${trail.length} pontos da trilha?`)) return
    await clearTrail()
    toast.success('Trilha limpa')
    refresh()
  }

  const handleSharePoint = async (p: TrailPoint) => {
    const text = `📍 ${p.label ? p.label + ' — ' : ''}Aussy Ontech
${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}
Salvo em ${new Date(p.timestamp).toLocaleString('pt-BR')}
https://maps.google.com/?q=${p.lat},${p.lon}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Aussy Ontech — Ponto GPS', text })
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copiado!')
      } catch (e) {
        toast.error('Falha ao copiar')
      }
    }
  }

  const handleExportTrail = () => {
    if (trail.length === 0) {
      toast.error('Trilha vazia')
      return
    }
    const lines = trail.slice().reverse().map((p, i) => {
      const time = new Date(p.timestamp).toLocaleString('pt-BR')
      return `${i + 1}. ${p.label ? p.label + ' — ' : ''}${p.lat.toFixed(6)}, ${p.lon.toFixed(6)} (${p.source}, ${time})\n   https://maps.google.com/?q=${p.lat},${p.lon}`
    })
    const text = `Aussy Ontech — Trilha GPS\n${trail.length} pontos salvos\n\n${lines.join('\n\n')}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trilha-gps-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Trilha exportada como .txt')
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMin / 60)
    const diffD = Math.floor(diffH / 24)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `há ${diffMin} min`
    if (diffH < 24) return `há ${diffH}h`
    return `há ${diffD}d`
  }

  return (
    <Card className="border-orbit/20 bg-orbit/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Route className="h-4 w-4 text-orbit" />
            Trilha GPS — posições salvas
          </span>
          <div className="flex gap-1">
            {trail.length > 0 && (
              <Button onClick={handleExportTrail} size="sm" variant="ghost" className="h-7 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Exportar
              </Button>
            )}
            {trail.length > 0 && (
              <Button onClick={handleClearAll} size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/10">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Salvar posição atual */}
        <div className="space-y-2">
          <Button
            onClick={handleSaveCurrent}
            disabled={saving || geoLoading}
            className="w-full h-10"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Salvar minha posição atual
          </Button>

          {/* Input de label opcional */}
          {showLabelInput === 'new' ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveWithLabel())}
                placeholder="Nome do ponto (ex: acampamento, rio)"
                className="flex-1 h-8 px-2 text-xs rounded-md border border-input bg-background"
                autoFocus
              />
              <Button onClick={() => handleSaveWithLabel()} size="sm" className="h-8">
                Salvar
              </Button>
              <Button onClick={() => { setShowLabelInput(null); setLabel('') }} size="sm" variant="ghost" className="h-8">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowLabelInput('new')}
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
            >
              + Salvar com nome (waypoint)
            </Button>
          )}
        </div>

        {/* Lista de pontos */}
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-3">Carregando...</div>
        ) : trail.length === 0 ? (
          <div className="text-center py-4 px-3">
            <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Nenhum ponto salvo. Salve posições para resgate ou para encontrar o caminho de volta.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {trail.map((p, i) => (
              <div
                key={p.id}
                className={`p-2 rounded-lg border ${
                  p.label
                    ? 'border-orbit/40 bg-orbit/10'
                    : 'border-border/40 bg-background/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orbit/20 border border-orbit/40 flex items-center justify-center">
                    <span className="text-[10px] font-mono-jet text-orbit">{trail.length - i}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {p.label ? (
                      <div className="font-medium text-xs truncate">{p.label}</div>
                    ) : null}
                    <div className="text-[11px] font-mono-jet text-muted-foreground truncate">
                      {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(p.timestamp)}
                      </span>
                      <span>·</span>
                      <span>{p.source === 'gps' ? 'GPS' : p.source === 'ip' ? 'IP' : 'manual'}</span>
                      {p.accuracy && (
                        <>
                          <span>·</span>
                          <span>±{Math.round(p.accuracy)}m</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button
                      onClick={() => handleSharePoint(p)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-signal hover:bg-signal/10"
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(p.id)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          💾 {trail.length}/{MAX_POINTS} posições salvas no aparelho. Permite resgate mesmo sem sinal — mostre a lista à equipe.
        </p>
      </CardContent>
    </Card>
  )
}
