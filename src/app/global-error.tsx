"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="w-full h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-bold">Algo deu errado</h2>
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
      </body>
    </html>
  )
}

