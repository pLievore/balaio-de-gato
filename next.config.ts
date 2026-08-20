import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // As fotos de produto vivem no Vercel Blob; sem isto o next/image recusa
    // a URL. O host tem o id da store como subdomínio, daí o curinga.
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    const permanent = false;

    return [
      // Rotas da loja atual: /products/:slug, /cart, /checkout e /pedido/:codigo
      // são páginas de verdade e não podem aparecer aqui.
      { source: '/search', destination: '/products', permanent },
      { source: '/about', destination: '/', permanent },
      { source: '/contact', destination: '/', permanent },
      { source: '/showroom', destination: '/', permanent },
      { source: '/delivery', destination: '/programa#entrega', permanent },
      { source: '/pickup', destination: '/programa#entrega', permanent },
      { source: '/returns', destination: '/terms', permanent },
      { source: '/login', destination: '/products', permanent },
      // A loja não tem área de cliente: o pedido é acompanhado por
      // /pedido/:codigo com a chave de acesso. As páginas em (public)/account
      // só faziam `redirect()`, e um redirect aqui custa menos que uma rota.
      { source: '/account', destination: '/products', permanent },
      { source: '/account/:path*', destination: '/products', permanent },
    ];
  },
};

export default nextConfig;
