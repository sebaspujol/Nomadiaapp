import './globals.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import Providers from './Providers'

export const metadata = {
  title: 'Nomadia — Encuentra tu espacio de trabajo en Madrid',
  description: 'Cafés, coworks y bibliotecas para trabajar en Madrid. Filtros por enchufes, wifi, precio, afluencia y más.',
  // manifest.json habilita el "Agregar a pantalla de inicio" en el celular
  // (queda con ícono propio y abre a pantalla completa, sin la barra del
  // navegador — la sensación de una app instalada, sin serlo de verdad).
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'nomadia',
  },
}

// Sin esta etiqueta, los navegadores de celular renderizan la página como si
// fuera de escritorio (~980px) y la achican para que entre — por eso nada de
// lo responsive funcionaba antes de agregar esto.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#111827',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&family=Michroma&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
