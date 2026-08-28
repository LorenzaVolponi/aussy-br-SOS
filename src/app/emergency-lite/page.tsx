export const dynamic = 'force-static'

const contacts = [
  { label: 'SAMU', number: '192', detail: 'Urgência médica' },
  { label: 'Bombeiros', number: '193', detail: 'Incêndio, resgate e salvamento' },
  { label: 'Polícia Militar', number: '190', detail: 'Emergência policial' },
  { label: 'Defesa Civil', number: '199', detail: 'Desastres e risco estrutural' },
] as const

export default function EmergencyLitePage() {
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-white px-5 py-8 text-zinc-950">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">AUSSY.SOS · modo extremo</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Emergência leve</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-700">
          Página mínima para abrir rápido quando rede, APIs ou recursos avançados estiverem instáveis. Ela não depende de dados externos para mostrar os contatos essenciais.
        </p>
      </header>

      <section aria-labelledby="contatos" className="space-y-3">
        <h2 id="contatos" className="text-lg font-bold">Ligar agora</h2>
        {contacts.map((contact) => (
          <a
            key={contact.number}
            href={`tel:${contact.number}`}
            className="flex min-h-20 items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3 no-underline"
          >
            <span>
              <strong className="block text-lg">{contact.label}</strong>
              <span className="text-sm text-zinc-600">{contact.detail}</span>
            </span>
            <span className="text-2xl font-black tabular-nums text-red-700">{contact.number}</span>
          </a>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-4" aria-labelledby="localizacao">
        <h2 id="localizacao" className="font-bold">Localização</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          Se o aparelho ainda tiver recursos suficientes, abra o SOS completo para obter GPS, precisão e compartilhamento. Se não abrir, informe verbalmente rua, ponto de referência e município ao atendente.
        </p>
        <a href="/?tab=emergency" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-zinc-950 px-4 font-bold text-white no-underline">
          Abrir SOS completo
        </a>
      </section>

      <section className="mt-8 text-sm leading-6 text-zinc-700" aria-labelledby="regra">
        <h2 id="regra" className="font-bold text-zinc-950">Regra de segurança</h2>
        <p className="mt-2">
          Não interprete ausência de dados como ausência de risco. Se houver perigo imediato, priorize sair da área de risco e contatar o serviço oficial adequado.
        </p>
      </section>
    </main>
  )
}
