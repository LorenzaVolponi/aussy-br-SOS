'use client'

import { useState } from 'react'
import {
  Globe,
  Search,
  Volume2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { PHRASES, LANGUAGES, CATEGORY_LABELS, type Phrase } from '@/lib/data/phrases'

/**
 * Frases de emergência multilíngues.
 * Mostra cada frase em PT-BR + N idiomas estrangeiros.
 * Permite falar a frase (Web Speech API) e copiar.
 */
export function MultilingualPhrases() {
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['en', 'es']) // inglês + espanhol por padrão
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('emergency')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleLang = (code: string) => {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    )
  }

  const handleSpeak = (text: string, lang: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Síntese de voz não suportada neste navegador')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    // Map code → BCP 47
    const bcpMap: Record<string, string> = {
      pt: 'pt-BR',
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      ja: 'ja-JP',
      zh: 'zh-CN',
      ar: 'ar-SA',
      ru: 'ru-RU',
    }
    utterance.lang = bcpMap[lang] || lang
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Copiado!')
      setTimeout(() => setCopiedId(null), 1500)
    } catch (e) {
      toast.error('Falha ao copiar')
    }
  }

  // Filtra por busca
  const filteredPhrases = PHRASES.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      p.pt.toLowerCase().includes(s) ||
      Object.values(p.translations).some((t) => t.toLowerCase().includes(s))
    )
  })

  // Agrupa por categoria
  const byCategory = filteredPhrases.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Phrase[]>)

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-blue-400" />
          Frases de emergência — multilíngue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Seleção de idiomas */}
        <div>
          <div className="text-[10px] font-mono-jet text-muted-foreground mb-1.5">
            IDIOMAS ({selectedLangs.length} selecionados)
          </div>
          <div className="flex flex-wrap gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => toggleLang(lang.code)}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  selectedLangs.includes(lang.code)
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'border-border/40 text-muted-foreground hover:bg-blue-500/10'
                }`}
              >
                <span className="mr-1">{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar frase..."
            className="h-8 text-xs pl-8"
          />
        </div>

        {/* Lista por categoria */}
        <div className="space-y-2">
          {Object.entries(byCategory).map(([cat, phrases]) => {
            const isExpanded = expandedCategory === cat || !!search
            return (
              <div key={cat} className="border border-border/40 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                  className="w-full flex items-center justify-between p-2 bg-background/40 hover:bg-background/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">{CATEGORY_LABELS[cat as Phrase['category']]}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {phrases.length}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-border/30">
                    {phrases.map((p) => (
                      <div key={p.id} className="p-2 space-y-1.5">
                        {/* Português (sempre) */}
                        <div className="flex items-start gap-2 group">
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex-shrink-0 mt-0.5">
                            PT
                          </Badge>
                          <span className="text-xs flex-1">{p.pt}</span>
                          <button
                            onClick={() => handleSpeak(p.pt, 'pt')}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-signal"
                            title="Falar"
                          >
                            <Volume2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleCopy(p.pt, `${p.id}-pt`)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-signal"
                            title="Copiar"
                          >
                            {copiedId === `${p.id}-pt` ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>

                        {/* Idiomas selecionados */}
                        {selectedLangs.map((code) => {
                          const lang = LANGUAGES.find((l) => l.code === code)
                          const translation = p.translations[code]
                          if (!translation) return null
                          return (
                            <div key={code} className="flex items-start gap-2 group pl-3">
                              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-500/10 border-blue-500/30 text-blue-400 flex-shrink-0 mt-0.5">
                                {lang?.flag} {code.toUpperCase()}
                              </Badge>
                              <span className="text-xs flex-1 text-muted-foreground">{translation}</span>
                              <button
                                onClick={() => handleSpeak(translation, code)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-blue-400"
                                title="Falar"
                              >
                                <Volume2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleCopy(translation, `${p.id}-${code}`)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-blue-400"
                                title="Copiar"
                              >
                                {copiedId === `${p.id}-${code}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          🌐 Para turistas estrangeiros. Botão <Volume2 className="h-2.5 w-2.5 inline" /> fala a frase (Web Speech API),
          botão <Copy className="h-2.5 w-2.5 inline" /> copia para enviar por mensagem. 22 frases em 9 idiomas + PT-BR.
        </p>
      </CardContent>
    </Card>
  )
}
