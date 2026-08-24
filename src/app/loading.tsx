export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground">
      <div className="mx-auto max-w-7xl space-y-4" aria-live="polite" aria-busy="true">
        <div className="h-12 animate-pulse rounded-xl bg-secondary/50" />
        <div className="grid gap-4 xl:grid-cols-[1.5fr_.8fr]">
          <div className="h-[420px] animate-pulse rounded-[28px] border border-border/40 bg-secondary/30" />
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-secondary/30" />
            <div className="h-32 animate-pulse rounded-2xl bg-secondary/30" />
            <div className="h-32 animate-pulse rounded-2xl bg-secondary/30" />
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Carregando recursos essenciais do Aussy…</p>
      </div>
    </main>
  )
}
