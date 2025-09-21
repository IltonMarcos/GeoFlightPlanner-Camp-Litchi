"use client"

import { Button } from "@/components/ui/button"
import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the real error to the console for diagnostics in production
    // This helps identify the root cause behind the friendly error UI
    // eslint-disable-next-line no-console
    console.error("App error:", error)
  }, [error])
  return (
    <div className="w-full h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold">Ocorreu um erro ao carregar o aplicativo</h2>
        <p className="text-sm text-muted-foreground">
          {process.env.NODE_ENV === "development"
            ? error?.message || "Erro desconhecido"
            : "Tente recarregar a página. Se o problema persistir, limpe o cache do navegador e tente novamente."}
        </p>
        {error?.digest && (
          <p className="text-xs text-muted-foreground">Código: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => reset()}>Tentar novamente</Button>
          <Button variant="outline" onClick={() => location.reload()}>Recarregar</Button>
        </div>
      </div>
    </div>
  )
}
