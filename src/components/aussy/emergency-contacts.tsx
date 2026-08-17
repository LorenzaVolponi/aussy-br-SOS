'use client'

import { useEffect, useState } from 'react'
import { Phone, Plus, Trash2, User, Users, Edit2, Check, X, Heart, AlertCircle, Contact as ContactIcon } from 'lucide-react'
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

interface Contact {
  id: string
  name: string
  phone: string
  relationship: string
  notes?: string
  priority?: boolean
}

const DB_NAME = 'aussy-offline'
const DB_VERSION = 1
const STORE = 'emergency-contacts'

// Helpers IndexedDB — 100% offline
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

async function listContacts(): Promise<Contact[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as Contact[])
    req.onerror = () => reject(req.error)
  })
}

async function saveContact(c: Contact): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(c)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function deleteContact(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const RELATIONSHIPS = [
  'Família',
  'Cônjuge',
  'Pai/Mãe',
  'Filho(a)',
  'Irmão(ã)',
  'Amigo(a)',
  'Vizinho',
  'Médico',
  'Trabalho',
  'Outro',
]

/**
 * Cartão de contatos de emergência pessoais — persiste em IndexedDB,
 * funciona 100% offline. Toque em um contato para ligar/SMS instantaneamente.
 */
export function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState<Omit<Contact, 'id'>>({
    name: '',
    phone: '',
    relationship: 'Família',
    notes: '',
    priority: false,
  })

  // Carrega contatos do IndexedDB
  const refresh = async () => {
    try {
      const list = await listContacts()
      // Ordena: priority primeiro, depois por nome
      list.sort((a, b) => {
        if (a.priority && !b.priority) return -1
        if (!a.priority && b.priority) return 1
        return a.name.localeCompare(b.name)
      })
      setContacts(list)
    } catch (e) {
      console.error('Erro carregando contatos:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({
      name: '',
      phone: '',
      relationship: 'Família',
      notes: '',
      priority: false,
    })
    setSheetOpen(true)
  }

  // Importar contatos do aparelho via Contacts Picker API (Android Chrome)
  const handleImportFromPhone = async () => {
    try {
      const nav = navigator as any
      if (!nav.contacts || !nav.contacts.select) {
        toast.info('Seu celular não suporta importação', {
          description: 'Use o botão "Adicionar" para cadastrar manualmente. (Contacts Picker API exige Android Chrome)',
        })
        return
      }
      const props = ['name', 'tel']
      const opts = { multiple: true }
      const result = await nav.contacts.select(props, opts)
      if (!result || result.length === 0) return
      let imported = 0
      for (const c of result) {
        const name = c.name?.[0] || 'Sem nome'
        const phone = c.tel?.[0] || ''
        if (!phone) continue
        const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await saveContact({
          id,
          name,
          phone,
          relationship: 'Outro',
          notes: 'Importado do aparelho',
          priority: false,
        })
        imported++
      }
      if (imported > 0) {
        toast.success(`${imported} contato(s) importado(s)`, {
          description: 'Disponíveis offline imediatamente.',
        })
        refresh()
      } else {
        toast.info('Nenhum contato com telefone selecionado')
      }
    } catch (e: any) {
      if (e.name === 'SecurityError' || e.name === 'AbortError') return
      toast.error('Falha ao importar contatos')
    }
  }

  const openEdit = (c: Contact) => {
    setEditing(c)
    setForm({
      name: c.name,
      phone: c.phone,
      relationship: c.relationship,
      notes: c.notes || '',
      priority: c.priority || false,
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Preencha nome e telefone')
      return
    }
    // Sanitiza telefone — só dígitos e +
    const phone = form.phone.replace(/[^\d+]/g, '')
    const id = editing?.id || `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const contact: Contact = { id, ...form, phone }
    try {
      await saveContact(contact)
      toast.success(editing ? 'Contato atualizado' : 'Contato salvo', {
        description: 'Disponível offline imediatamente.',
      })
      setSheetOpen(false)
      refresh()
    } catch (e) {
      toast.error('Erro ao salvar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este contato?')) return
    try {
      await deleteContact(id)
      toast.success('Contato excluído')
      refresh()
    } catch (e) {
      toast.error('Erro ao excluir')
    }
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`
  }

  const handleSms = (phone: string) => {
    window.location.href = `sms:${phone.replace(/[^\d+]/g, '')}`
  }

  return (
    <Card className="border-rose-500/20 bg-rose-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-rose-400" />
            Meus contatos de emergência
          </span>
          <div className="flex gap-1">
            <Button onClick={handleImportFromPhone} size="sm" variant="ghost" className="h-7 text-xs">
              <ContactIcon className="h-3 w-3 mr-1" />
              Importar
            </Button>
            <Button onClick={openNew} size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            Carregando contatos...
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-6 px-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              Nenhum contato salvo. Adicione familiares e pessoas próximas — acessível offline.
            </p>
            <Button onClick={openNew} size="sm" variant="outline" className="text-xs h-8">
              <Plus className="h-3 w-3 mr-1" />
              Adicionar primeiro contato
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {contacts.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  c.priority
                    ? 'border-rose-500/40 bg-rose-500/10'
                    : 'border-border/40 bg-background/40'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    c.priority ? 'bg-rose-500/20 text-rose-300' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {c.priority ? <Heart className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{c.name}</span>
                    {c.priority && (
                      <Badge variant="outline" className="text-[9px] font-mono-jet px-1 py-0 h-4 border-rose-500/40 text-rose-400">
                        PRIORITÁRIO
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{c.phone}</span>
                    <span className="text-[10px]">·</span>
                    <span className="truncate">{c.relationship}</span>
                  </div>
                  {c.notes && (
                    <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                      {c.notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    onClick={() => handleCall(c.phone)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10"
                    title="Ligar"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleSms(c.phone)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-signal hover:bg-signal/10"
                    title="SMS"
                  >
                    <MessageCircleSm />
                  </Button>
                  <Button
                    onClick={() => openEdit(c)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Editar"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(c.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                    title="Excluir"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 pt-2 leading-relaxed">
          💾 Contatos salvos no aparelho (IndexedDB). Funcionam 100% offline — não sincronizam com servidores.
        </p>
      </CardContent>

      {/* Sheet de criação/edição */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {editing ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editing ? 'Editar contato' : 'Novo contato de emergência'}
            </SheetTitle>
            <SheetDescription>
              Salvo localmente. Acessível sem internet.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 mt-4 px-1">
            <div>
              <Label htmlFor="name" className="text-xs">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Maria Silva"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rel" className="text-xs">Relacionamento</Label>
              <select
                id="rel"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="notes" className="text-xs">Notas (opcional)</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: Tem chave de casa / alérgico a penicilina"
                className="mt-1"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-rose-500/30 bg-rose-500/5">
              <input
                type="checkbox"
                checked={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.checked })}
                className="w-4 h-4 accent-rose-500"
              />
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-xs font-medium">Contato prioritário</span>
              </div>
              <span className="text-[10px] text-muted-foreground ml-auto">
                aparece destacado
              </span>
            </label>
          </div>

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

// Ícone menor (lucide-react não tem MessageCircleSm)
function MessageCircleSm() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  )
}
