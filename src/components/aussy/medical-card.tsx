'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  Heart,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  QrCode,
  User,
  Droplet,
  AlertCircle,
  Pill,
  Phone,
  Download,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

interface MedicalCard {
  id: 'medical-card' // singleton
  fullName: string
  birthDate: string
  bloodType: string
  allergies: string[]
  medications: string[]
  conditions: string[]
  iceName: string // In Case of Emergency
  icePhone: string
  organDonor: boolean
  notes: string
  updatedAt: string
}

const EMPTY_CARD: MedicalCard = {
  id: 'medical-card',
  fullName: '',
  birthDate: '',
  bloodType: '',
  allergies: [],
  medications: [],
  conditions: [],
  iceName: '',
  icePhone: '',
  organDonor: false,
  notes: '',
  updatedAt: '',
}

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const DB_NAME = 'aussy-offline'
const DB_VERSION = 1
const STORE = 'medical-card'

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

async function loadCard(): Promise<MedicalCard | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get('medical-card')
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

async function saveCardDb(card: MedicalCard): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(card)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function deleteCardDb(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete('medical-card')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Ficha médica de emergência com QR Code.
 * Paramédicos/equipes de resgate escaneiam o QR e veem instantaneamente:
 * - Nome, tipo sanguíneo, alergias, medicamentos
 * - Condições crônicas, contato ICE
 * - Doador de órgãos
 *
 * 100% offline: dados em IndexedDB, QR gerado client-side.
 */

// Converte data URL para Blob — compatível com iOS Safari (não usa fetch(data:))
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const base64 = match[2]
    const byteChars = atob(base64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  } catch {
    return null
  }
}

export function MedicalCardQR() {
  const [card, setCard] = useState<MedicalCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [form, setForm] = useState<MedicalCard>(EMPTY_CARD)
  // Campos de lista (alergias, meds, condições)
  const [newAllergy, setNewAllergy] = useState('')
  const [newMed, setNewMed] = useState('')
  const [newCondition, setNewCondition] = useState('')

  // Carrega do IndexedDB
  const refresh = async () => {
    try {
      const c = await loadCard()
      setCard(c)
    } catch (e) {
      console.error('Erro carregando ficha médica:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // Gera QR Code quando abre o modal
  useEffect(() => {
    if (!qrOpen || !card) {
      setQrDataUrl('')
      return
    }
    // Formato compacto para QR — vCard-like mas simplificado
    const text = `Aussy Ontech - FICHA MEDICA
NOME: ${card.fullName}
NASC: ${card.birthDate}
TIPO SANGUE: ${card.bloodType}
ALERGIAS: ${card.allergies.join(', ') || 'nenhuma'}
MEDICAMENTOS: ${card.medications.join(', ') || 'nenhum'}
CONDICOES: ${card.conditions.join(', ') || 'nenhuma'}
CONTATO ICE: ${card.iceName} - ${card.icePhone}
DOADOR: ${card.organDonor ? 'SIM' : 'NAO'}
OBS: ${card.notes || '-'}
Atualizado: ${new Date(card.updatedAt).toLocaleString('pt-BR')}`

    QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: { dark: '#0a0a0a', light: '#ffffff' },
      errorCorrectionLevel: 'L',
    })
      .then(setQrDataUrl)
      .catch((e) => toast.error('Erro ao gerar QR'))
  }, [qrOpen, card])

  const openEdit = () => {
    setForm(card || EMPTY_CARD)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast.error('Preencha pelo menos o nome')
      return
    }
    const updated: MedicalCard = {
      ...form,
      allergies: form.allergies.filter(Boolean),
      medications: form.medications.filter(Boolean),
      conditions: form.conditions.filter(Boolean),
      updatedAt: new Date().toISOString(),
    }
    try {
      await saveCardDb(updated)
      setCard(updated)
      setEditOpen(false)
      toast.success('Ficha médica salva', {
        description: 'Disponível offline. Botão "Mostrar QR" para resgate.',
      })
    } catch (e) {
      toast.error('Erro ao salvar')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Apagar ficha médica? Esta ação não pode ser desfeita.')) return
    try {
      await deleteCardDb()
      setCard(null)
      toast.success('Ficha médica apagada')
    } catch (e) {
      toast.error('Erro ao apagar')
    }
  }

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setForm({ ...form, allergies: [...form.allergies, newAllergy.trim()] })
      setNewAllergy('')
    }
  }
  const addMed = () => {
    if (newMed.trim()) {
      setForm({ ...form, medications: [...form.medications, newMed.trim()] })
      setNewMed('')
    }
  }
  const addCondition = () => {
    if (newCondition.trim()) {
      setForm({ ...form, conditions: [...form.conditions, newCondition.trim()] })
      setNewCondition('')
    }
  }

  const removeAllergy = (i: number) => setForm({ ...form, allergies: form.allergies.filter((_, idx) => idx !== i) })
  const removeMed = (i: number) => setForm({ ...form, medications: form.medications.filter((_, idx) => idx !== i) })
  const removeCondition = (i: number) => setForm({ ...form, conditions: form.conditions.filter((_, idx) => idx !== i) })

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `ficha-medica-${card?.fullName?.replace(/\s/g, '-').toLowerCase() || 'aussy'}.png`
    a.click()
    toast.success('QR Code baixado')
  }

  const handleShareQr = async () => {
    if (!qrDataUrl) return
    try {
      // Converte data URL para Blob sem usar fetch(data:) — iOS Safari bloqueia
      const blob = dataUrlToBlob(qrDataUrl)
      if (!blob) {
        handleDownloadQr()
        return
      }
      const file = new File([blob], 'ficha-medica.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Aussy Ontech — Ficha Médica',
          files: [file],
        })
      } else {
        handleDownloadQr()
      }
    } catch (e) {
      handleDownloadQr()
    }
  }

  return (
    <>
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" />
              Minha ficha médica de emergência
            </span>
            {card && (
              <div className="flex gap-1">
                <Button onClick={() => setQrOpen(true)} size="sm" className="h-7 text-xs">
                  <QrCode className="h-3 w-3 mr-1" />
                  Mostrar QR
                </Button>
                <Button onClick={openEdit} size="sm" variant="outline" className="h-7 text-xs">
                  <Edit2 className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-4">Carregando...</div>
          ) : !card ? (
            <div className="text-center py-6 px-3">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Crie sua ficha médica de emergência. Em caso de acidente, paramédicos podem escanear o QR Code e ver
                instantaneamente seu tipo sanguíneo, alergias e contato de emergência.
              </p>
              <Button onClick={openEdit} size="sm" className="text-xs h-8">
                <Plus className="h-3 w-3 mr-1" />
                Criar ficha médica
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Linha 1: Nome + sangue */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <User className="h-5 w-5 text-rose-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{card.fullName}</div>
                  {card.birthDate && (
                    <div className="text-[10px] text-muted-foreground">
                      Nasc: {new Date(card.birthDate).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                {card.bloodType && (
                  <div className="flex flex-col items-center justify-center px-2 py-1 rounded border border-rose-500/40 bg-rose-500/10">
                    <Droplet className="h-3 w-3 text-rose-400" />
                    <span className="text-sm font-bold text-rose-300">{card.bloodType}</span>
                  </div>
                )}
              </div>

              {/* Grid de informações críticas */}
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {card.allergies.length > 0 && (
                  <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono-jet text-[10px] text-amber-400">ALERGIAS:</span>{' '}
                      <span className="font-medium">{card.allergies.join(', ')}</span>
                    </div>
                  </div>
                )}
                {card.medications.length > 0 && (
                  <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                    <Pill className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono-jet text-[10px] text-blue-400">MEDICAMENTOS:</span>{' '}
                      <span className="font-medium">{card.medications.join(', ')}</span>
                    </div>
                  </div>
                )}
                {card.conditions.length > 0 && (
                  <div className="flex items-start gap-2 p-2 rounded bg-purple-500/10 border border-purple-500/20">
                    <Heart className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono-jet text-[10px] text-purple-400">CONDIÇÕES:</span>{' '}
                      <span className="font-medium">{card.conditions.join(', ')}</span>
                    </div>
                  </div>
                )}
                {card.iceName && (
                  <div className="flex items-start gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <Phone className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono-jet text-[10px] text-emerald-400">CONTATO ICE:</span>{' '}
                      <span className="font-medium">{card.iceName} · {card.icePhone}</span>
                    </div>
                  </div>
                )}
                {card.organDonor && (
                  <Badge variant="outline" className="text-[10px] w-fit border-rose-500/40 text-rose-400">
                    DOADOR DE ÓRGÃOS
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground/60">
                  💾 Salvo no aparelho · atualizado {new Date(card.updatedAt).toLocaleDateString('pt-BR')}
                </p>
                <Button onClick={handleDelete} size="sm" variant="ghost" className="h-6 text-xs text-red-400 hover:bg-red-500/10">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Apagar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet de edição */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" />
              Ficha médica de emergência
            </SheetTitle>
            <SheetDescription>
              Estes dados ficam no seu aparelho. Em emergência, mostre o QR Code para o paramédico.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4 px-1">
            {/* Dados pessoais */}
            <div>
              <Label htmlFor="fullName" className="text-xs">Nome completo *</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="João da Silva"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="birthDate" className="text-xs">Data de nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bloodType" className="text-xs">Tipo sanguíneo</Label>
                <select
                  id="bloodType"
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>{bt || '— não sei —'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Alergias */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-400" />
                Alergias
              </Label>
              <div className="flex gap-1 mt-1">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  placeholder="Ex: penicilina, amendoim"
                  className="text-xs"
                />
                <Button onClick={addAllergy} size="sm" variant="outline" type="button">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {form.allergies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.allergies.map((a, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1 bg-amber-500/10 border-amber-500/30 text-amber-400">
                      {a}
                      <button onClick={() => removeAllergy(i)} className="hover:text-amber-200">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Medicamentos */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Pill className="h-3 w-3 text-blue-400" />
                Medicamentos de uso contínuo
              </Label>
              <div className="flex gap-1 mt-1">
                <Input
                  value={newMed}
                  onChange={(e) => setNewMed(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMed())}
                  placeholder="Ex: Losartana 50mg"
                  className="text-xs"
                />
                <Button onClick={addMed} size="sm" variant="outline" type="button">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {form.medications.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.medications.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1 bg-blue-500/10 border-blue-500/30 text-blue-400">
                      {m}
                      <button onClick={() => removeMed(i)} className="hover:text-blue-200">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Condições */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Heart className="h-3 w-3 text-purple-400" />
                Condições crônicas
              </Label>
              <div className="flex gap-1 mt-1">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                  placeholder="Ex: diabetes, hipertensão"
                  className="text-xs"
                />
                <Button onClick={addCondition} size="sm" variant="outline" type="button">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {form.conditions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.conditions.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
                      {c}
                      <button onClick={() => removeCondition(i)} className="hover:text-purple-200">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* ICE */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="iceName" className="text-xs">Contato de emergência</Label>
                <Input
                  id="iceName"
                  value={form.iceName}
                  onChange={(e) => setForm({ ...form, iceName: e.target.value })}
                  placeholder="Maria Silva"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="icePhone" className="text-xs">Telefone ICE</Label>
                <Input
                  id="icePhone"
                  value={form.icePhone}
                  onChange={(e) => setForm({ ...form, icePhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="notes" className="text-xs">Observações</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: usa marca-passo / gestante / prótese no joelho"
                className="mt-1"
              />
            </div>

            {/* Doador */}
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-rose-500/30 bg-rose-500/5">
              <input
                type="checkbox"
                checked={form.organDonor}
                onChange={(e) => setForm({ ...form, organDonor: e.target.checked })}
                className="w-4 h-4 accent-rose-500"
              />
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-xs font-medium">Doador de órgãos</span>
            </label>
          </div>

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              Salvar ficha
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet de QR Code para mostrar ao paramédico */}
      <Sheet open={qrOpen} onOpenChange={setQrOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-rose-400" />
              Mostre este QR ao paramédico
            </SheetTitle>
            <SheetDescription>
              O profissional escaneia com a câmera do celular e vê sua ficha completa.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code da ficha médica" className="w-72 h-72" />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center text-xs text-muted-foreground">
                  Gerando QR...
                </div>
              )}
            </div>

            {/* Resumo visível também como texto (caso o QR não seja escaneável) */}
            {card && (
              <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-1">
                <div className="text-[10px] font-mono-jet text-muted-foreground mb-1.5">RESUMO DA FICHA</div>
                <div className="text-xs"><strong>{card.fullName}</strong> · {card.bloodType || 'tipo sanguíneo não informado'}</div>
                {card.allergies.length > 0 && (
                  <div className="text-[11px] text-amber-400">⚠️ Alergias: {card.allergies.join(', ')}</div>
                )}
                {card.iceName && (
                  <div className="text-[11px] text-emerald-400">📞 ICE: {card.iceName} · {card.icePhone}</div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleShareQr} variant="outline" size="sm" className="h-10">
                <Share2 className="h-4 w-4 mr-1.5" />
                Compartilhar
              </Button>
              <Button onClick={handleDownloadQr} size="sm" className="h-10">
                <Download className="h-4 w-4 mr-1.5" />
                Baixar PNG
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
