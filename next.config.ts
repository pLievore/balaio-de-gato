import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
