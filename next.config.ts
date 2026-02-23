import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', '@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  webpack: (config) => {
    // Força a versão UMD de @floating-ui/react-dom para evitar o erro
    // "ReactDOM.flushSync is not a function" com React 19 + Next.js 15.
    // O ESM (.mjs) usa `import * as ReactDOM` e acessa ReactDOM.flushSync,
    // mas o namespace CJS não expõe flushSync como named export.
    // A versão UMD usa o global window.ReactDOM e funciona corretamente.
    config.resolve.alias['@floating-ui/react-dom'] = path.resolve(
      './node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.umd.js'
    )
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'https', hostname: '**.instagram.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
}

export default nextConfig
