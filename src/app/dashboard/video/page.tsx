'use client'

import { VideoGenerator } from '@/components/content/video-generator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function VideoPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Gerador de Vídeos</h1>
        <p className="text-muted-foreground mt-2">
          Crie vídeos profissionais com IA usando o VEO 3.1
        </p>
      </div>

      <VideoGenerator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Capacidades:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>Geração de texto para vídeo</li>
            <li>Duração: 4, 6 ou 8 segundos</li>
            <li>Resolução: 720p</li>
            <li>Aspecto: 9:16 (ideal para Reels)</li>
          </ul>
          <p><strong>Dicas:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Use descrições detalhadas e específicas</li>
            <li>Especifique o tom, estilo e ambiente</li>
            <li>Indique movimentos de câmera desejados</li>
            <li>Mencione elementos visuais-chave</li>
            <li>Durações curtas (6-8s) geram melhor qualidade</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
