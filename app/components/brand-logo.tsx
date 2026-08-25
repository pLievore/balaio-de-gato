import Image from 'next/image';

import { cn } from '../../src/lib/cn';

export const OFFICIAL_LOGO_PATH = '/brand/balaio-de-gato.jpg';
export const BRAND_MARK_PATH = '/brand/balaio-icon.png';
export const BRAND_SOCIAL_PATH = '/brand/balaio-social.jpg';

/**
 * Recorte visual não destrutivo do mascote da arte oficial.
 *
 * O JPG original continua intacto em `public/brand`. Como a assinatura completa
 * é quase quadrada, ela ficaria ilegível nos espaços pequenos do header e do
 * painel. Este componente usa o mesmo arquivo e apenas recorta a ilustração com
 * CSS; o nome da empresa permanece em texto ao lado quando necessário.
 */
export function BrandMark({
  className,
  priority = false,
  sizes = '128px',
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative block shrink-0 overflow-hidden bg-white', className)}
    >
      <Image
        src={BRAND_MARK_PATH}
        alt=""
        width={512}
        height={512}
        sizes={sizes}
        quality={90}
        priority={priority}
        className="absolute inset-0 size-full object-cover"
      />
    </span>
  );
}

/** Assinatura completa, preservando exatamente a arte entregue pelo cliente. */
export function OfficialBrandLogo({
  className,
  priority = false,
  sizes = '(max-width: 640px) calc(100vw - 40px), 620px',
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={OFFICIAL_LOGO_PATH}
      alt="Papelaria Armazém Balaio de Gato"
      width={2370}
      height={1792}
      sizes={sizes}
      quality={90}
      priority={priority}
      className={cn('h-auto w-full object-contain', className)}
    />
  );
}
