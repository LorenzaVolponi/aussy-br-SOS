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
      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      resolve(all)
    }
    req.onerror = () => reject(req.error)
  })
}

async function savePoint(point: TrailPoint): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(point)
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

async function enforceTrailLimit(): Promise<void> {
  const all = await listTrail()
  const overflow = all.slice(MAX_POINTS)
  await Promise.all(overflow.map((point) => deletePoint(point.id)))
}

function sourceLabel(source: string): string {
  if (source === 'gps') return 'GPS'
  if (source === 'ip') return 'IP aproximado'
  if (source === 'cached') return 'CACHE'
  if (source === 'manual') return 'MANUAL'
  return source
}

/**
 * Trilha de posições — salva no aparelho (IndexedDB) para consulta local.
 * A proveniência de cada ponto é preservada: GPS, IP, cache ou manual.
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
    } catch (error) {
      console.error('Erro carregando trilha:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const resolveCurrentPoint = async () => {
    if (point) return point
    return await detect(true)
  }

  const handleSaveCurrent = async () => {
    setSaving(true)
    try {
      const current = await resolveCurrentPoint()
      if (!current) {
        toast.error('Não foi possível obter uma localização válida', {
          description: 'Autorize o GPS ou tente novamente quando houver rede/posição salva.',
        })
        return
      }

      const newPoint: TrailPoint = {
        id: `trail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        lat: current.lat,
        lon: current.lon,
        accuracy: current.accuracy,
        source: current.source,
        timestamp: new Date().toISOString(),
      }

      await savePoint(newPoint)
      await enforceTrailLimit()
      toast.success('Posição salva na trilha', {
        description: `${current.lat.toFixed(5)}, ${current.lon.toFixed(5)} · ${sourceLabel(current.source)}`,
      })
      await refresh()
    } catch {
      toast.error('Erro ao salvar posição')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWithLabel = async (id?: string) => {
    const cleanLabel = label.trim()
    if (!cleanLabel) {
      toast.error('Digite um nome para o ponto')
      return
    }

    if (id) {
      const existing = trail.find((trailPoint) => trailPoint.id === id)
      if (existing) {
        try {
          await savePoint({ ...existing, label: cleanLabel })
          toast.success('Ponto renomeado')
          setShowLabelInput(null)
          setLabel('')
          await refresh()
        } catch {
          toast.error('Erro ao renomear ponto')
        }
        return
      }
    }

    setSaving(true)
    try {
      const current = await resolveCurrentPoint()
      if (!current) {
        toast.error('Não foi possível obter uma localização válida')
        return
      }

      const newPoint: TrailPoint = {
        id: `trail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        lat: current.lat,
        lon: current.lon,
        accuracy: current.accuracy,
        source: current.source,
        label: cleanLabel,
        timestamp: new Date().toISOString(),
      }

      await savePoint(newPoint)
      await enforceTrailLimit()
      toast.success(`Ponto "${cleanLabel}" salvo`, {
        description: `${sourceLabel(current.source)} · ${current.lat.toFixed(5)}, ${current.lon.toFixed(5)}`,
      })
      setShowLabelInput(null)
      setLabel('')
      await refresh()
    } catch {
      toast.error('Erro ao salvar waypoint')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePoint(id)
      toast.success('Ponto removido')
      await refresh()
    } catch {
      toast.error('Erro ao remover ponto')
    }
  }

  const handleClearAll = async () => {
    if (!confirm(`Apagar todos os ${trail.length} pontos da trilha?`)) return
    try {
      await clearTrail()
      toast.success('Trilha limpa')
      await refresh()
    } catch {
      toast.error('Erro ao limpar trilha')
    }
  }

  const handleSharePoint = async (trailPoint: TrailPoint) => {
    const text = `📍 ${trailPoint.label ? `${trailPoint.label} — ` : ''}Aussy Ontech\n${trailPoint.lat.toFixed(6)}, ${trailPoint.lon.toFixed(6)}\nOrigem: ${sourceLabel(trailPoint.source)}\nSalvo em ${new Date(trailPoint.timestamp).toLocaleString('pt-BR')}\nhttps://maps.google.com/?q=${trailPoint.lat},${trailPoint.lon}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Aussy Ontech — Ponto de localização', text })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copiado!')
      } catch {
        toast.error('Falha ao copiar')
      }
    }
  }

  const handleExportTrail = () => {
    if (trail.length === 0) {
      toast.error('Trilha vazia')
      return
    }
    const lines = trail.slice().reverse().map((trailPoint, index) => {
      const time = new Date(trailPoint.timestamp).toLocaleString('pt-BR')
      return `${index + 1}. ${trailPoint.label ? `${trailPoint.label} — ` : ''}${trailPoint.lat.toFixed(6)}, ${trailPoint.lon.toFixed(6)} (${sourceLabel(trailPoint.source)}, ${time})\n   https://maps.google.com/?q=${trailPoint.lat},${trailPoint.lon}`
    })
    const text = `Aussy Ontech — Trilha de posições\n${trail.length} pontos salvos\n\n${lines.join('\n\n')}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `trilha-gps-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success('Trilha exportada como .txt')
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const diffMs = Date.now() - date.getTime()
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
              <Button onClick={handleClearAll} size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/10" aria-label="Limpar trilha">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Button
            onClick={handleSaveCurrent}
            disabled={saving || geoLoading}
            className="w-full h-10"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {saving || geoLoading ? 'Obtendo e salvando posição...' : 'Salvar minha posição atual'}
          </Button>

          {showLabelInput === 'new' ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleSaveWithLabel()
                  }
                }}
                placeholder="Nome do ponto (ex: acampamento, rio)"
                className="flex-1 h-8 px-2 text-xs rounded-md border border-input bg-background"
                autoFocus
                disabled={saving || geoLoading}
              />
              <Button onClick={() => void handleSaveWithLabel()} size="sm" className="h-8" disabled={saving || geoLoading}>
                Salvar
              </Button>
              <Button onClick={() => { setShowLabelInput(null); setLabel('') }} size="sm" variant="ghost" className="h-8" disabled={saving}>
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

        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-3">Carregando...</div>
        ) : trail.length === 0 ? (
          <div className="text-center py-4 px-3">
            <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Nenhum ponto salvo. Salve posições para consulta local ou para compartilhar com uma equipe de resgate.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {trail.map((trailPoint, index) => (
              <div
                key={trailPoint.id}
                className={`p-2 rounded-lg border ${
                  trailPoint.label
                    ? 'border-orbit/40 bg-orbit/10'
                    : 'border-border/40 bg-background/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orbit/20 border border-orbit/40 flex items-center justify-center">
                    <span className="text-[10px] font-mono-jet text-orbit">{trail.length - index}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {trailPoint.label ? <div className="font-medium text-xs truncate">{trailPoint.label}</div> : null}
                    <div className="text-[11px] font-mono-jet text-muted-foreground truncate">
                      {trailPoint.lat.toFixed(5)}, {trailPoint.lon.toFixed(5)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(trailPoint.timestamp)}
                      </span>
                      <span>·</span>
                      <span>{sourceLabel(trailPoint.source)}</span>
                      {trailPoint.accuracy != null && (
                        <>
                          <span>·</span>
                          <span>±{Math.round(trailPoint.accuracy)}m</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button
                      onClick={() => void handleSharePoint(trailPoint)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-signal hover:bg-signal/10"
                      aria-label="Compartilhar ponto"
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => void handleDelete(trailPoint.id)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                      aria-label="Remover ponto"
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
          💾 {trail.length}/{MAX_POINTS} posições mantidas no aparelho. A lista continua consultável sem rede; abrir links ou compartilhar por apps externos depende dos recursos disponíveis no dispositivo.
        </p>
      </CardContent>
    </Card>
  )
}
