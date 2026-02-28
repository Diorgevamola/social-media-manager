'use client'

import { VideoGenerator } from '@/components/content/video-generator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function VideoPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Gerador de Vídeos</h1>
        <p className="text-muted-foreground mt-2">
          Crie vídeos profissionais com IA usando VEO 3.1, Seedance 1.0 ou Seedance 2.0
        </p>
      </div>

      <Alert>
        <CheckCircle className="size-4" />
        <AlertTitle>Seedance 2.0 Disponível! 🎉</AlertTitle>
        <AlertDescription>
          Agora você pode usar Seedance 2.0, a última geração com qualidade superior, resoluções até 2K e preços 3x mais baratos que a v1.
        </AlertDescription>
      </Alert>

      <VideoGenerator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Capacidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✓ Texto para vídeo</p>
            <p>✓ Imagem para vídeo (Seedance)</p>
            <p>✓ Áudio nativo com lip-sync</p>
            <p>✓ Até 12 arquivos de referência</p>
            <p>✓ Resoluções até 2K (Seedance 2.0)</p>
            <p>✓ Durações: 4-15 segundos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preços Estimados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>VEO 3.1: ~$0.15/min</p>
            <p>Seedance 1.0: ~$0.10/min</p>
            <p>Seedance 2.0: ~$0.05/min ⭐</p>
            <p>10s em 1080p: ~$0.01-$0.03</p>
            <p className="text-xs text-muted-foreground pt-2">
              100x mais barato que Sora 2
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dicas de Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Use descrições detalhadas</p>
            <p>• Especifique o tom e estilo</p>
            <p>• Indique movimento de câmera</p>
            <p>• Mencionue objetos-chave</p>
            <p>• Durações curtas = melhores</p>
          </CardContent>
        </Card>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Atenção</AlertTitle>
        <AlertDescription>
          Para usar Seedance 2.0, certifique-se de que a chave LAOZHANG_API_KEY está configurada no .env.local
        </AlertDescription>
      </Alert>
    </div>
  )
}
