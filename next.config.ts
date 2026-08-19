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
      { source: '/collections/:path*', destination: '/products', permanent },
      { source: '/about', destination: '/', permanent },
      { source: '/contact', destination: '/', permanent },
      { source: '/showroom', destination: '/', permanent },
      { source: '/delivery', destination: '/programa#entrega', permanent },
      { source: '/pickup', destination: '/programa#entrega', permanent },
      { source: '/returns', destination: '/terms', permanent },
      { source: '/login', destination: '/products', permanent },
      { source: '/pages/:path*', destination: '/', permanent },
      { source: '/policies/privacy-policy', destination: '/privacy', permanent },
      { source: '/policies/terms-of-service', destination: '/terms', permanent },
      { source: '/policies/refund-policy', destination: '/terms', permanent },
      {
        source: '/policies/shipping-policy',
        destination: '/programa#entrega',
        permanent,
      },
      { source: '/blogs/:path*', destination: '/', permanent },
    ];
  },
};

export default nextConfig;
