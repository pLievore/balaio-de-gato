/**
 * Ilustrações de produto.
 *
 * Enquanto as fotos reais não chegam, cada produto ganha um desenho vetorial
 * próprio do seu arquétipo — caderno, lápis, mochila. É melhor que um
 * placeholder por três motivos: o catálogo fica visualmente variado, o peso da
 * página não muda (é SVG inline, sem requisição) e o desenho nunca "quebra"
 * como uma imagem ausente.
 *
 * A cor de cada peça vem do slug, então o mesmo produto tem sempre a mesma
 * aparência entre servidor e cliente, e dois cadernos vizinhos na grade nunca
 * saem idênticos.
 */

import type { IllustrationKey } from '../../src/lib/catalog/product';
import { cn } from '../../src/lib/cn';

const INK = '#403030';
const INK_SOFT = '#70564C';
const PAPER = '#FFFFFF';

/**
 * Cores de peça derivadas da arte oficial: laranja, amarelo, coral, turquesa
 * e os tons complementares do material escolar ilustrado.
 */
const PIECE_COLORS = [
  { base: '#A84B08', light: '#E08018', dark: '#7D3100' }, // laranja oficial
  { base: '#509FA3', light: '#9FD5D5', dark: '#205E61' }, // turquesa da marca
  { base: '#FF5060', light: '#FFA1AA', dark: '#B12334' }, // coral da marca
  { base: '#F0AA16', light: '#FFD970', dark: '#9B6500' }, // amarelo da marca
  { base: '#7656A4', light: '#B9A4D8', dark: '#4E3870' }, // roxo dos detalhes
  { base: '#D76591', light: '#F1AEC8', dark: '#91405F' }, // rosa dos detalhes
  { base: '#579548', light: '#A9D29B', dark: '#356529' }, // verde dos detalhes
  { base: '#E08018', light: '#F4B768', dark: '#A84B08' }, // laranja vivo
] as const;

const BACKDROPS = ['#FCF1E5', '#EAF7F6', '#FFF3C4', '#FFF8F0'] as const;

/** Hash estável e pequeno — só precisa espalhar, não precisa ser criptográfico. */
function hashSlug(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

type Palette = {
  base: string;
  light: string;
  dark: string;
  backdrop: string;
};

function paletteFor(seed: string): Palette {
  const hash = hashSlug(seed);
  const piece = PIECE_COLORS[hash % PIECE_COLORS.length]!;
  const backdrop = BACKDROPS[(hash >> 3) % BACKDROPS.length]!;
  return { ...piece, backdrop };
}

type DrawProps = { c: Palette };

// ─── Cadernos e papéis ───────────────────────────────────────────────────────

function Caderno({ c }: DrawProps) {
  return (
    <g>
      <rect x="52" y="38" width="98" height="126" rx="7" fill={PAPER} />
      <rect x="52" y="38" width="98" height="126" rx="7" fill="none" stroke={INK} strokeWidth="3" />
      <rect x="52" y="38" width="30" height="126" rx="7" fill={c.base} />
      <path d="M82 38v126" stroke={INK} strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M60 ${54 + i * 20}q8 -9 16 0`}
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M94 ${68 + i * 20}h44`}
          stroke={INK_SOFT}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.4"
        />
      ))}
    </g>
  );
}

function Bloco({ c }: DrawProps) {
  return (
    <g>
      <rect x="48" y="46" width="104" height="118" rx="6" fill={c.light} opacity="0.5" />
      <rect x="54" y="40" width="98" height="118" rx="6" fill={PAPER} />
      <rect x="54" y="40" width="98" height="118" rx="6" fill="none" stroke={INK} strokeWidth="3" />
      <rect x="54" y="40" width="98" height="20" rx="6" fill={c.base} />
      <path d="M54 60h98" stroke={INK} strokeWidth="3" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={70 + i * 17} cy="50" r="3" fill={PAPER} opacity="0.85" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M68 ${80 + i * 16}h70`}
          stroke={INK_SOFT}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.42"
        />
      ))}
    </g>
  );
}

function Papel({ c }: DrawProps) {
  return (
    <g>
      <rect
        x="40"
        y="52"
        width="90"
        height="112"
        rx="5"
        fill={c.light}
        stroke={INK}
        strokeWidth="3"
        transform="rotate(-7 85 108)"
      />
      <rect
        x="58"
        y="44"
        width="90"
        height="112"
        rx="5"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
        transform="rotate(4 103 100)"
      />
      <rect
        x="66"
        y="40"
        width="90"
        height="112"
        rx="5"
        fill={PAPER}
        stroke={INK}
        strokeWidth="3"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M80 ${66 + i * 18}h${i === 4 ? 40 : 62}`}
          stroke={INK_SOFT}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.45"
        />
      ))}
    </g>
  );
}

// ─── Escrita ─────────────────────────────────────────────────────────────────

/** Um lápis desenhado ao longo do eixo Y, para poder ser rotacionado e repetido. */
function PencilShape({
  x,
  color,
  dark,
  top = 34,
  bottom = 150,
}: {
  x: number;
  color: string;
  dark: string;
  top?: number;
  bottom?: number;
}) {
  const tipBase = bottom - 26;
  return (
    <g>
      <rect x={x - 13} y={top} width="26" height={tipBase - top} rx="3" fill={color} />
      <path d={`M${x - 4} ${top}v${tipBase - top}`} stroke={dark} strokeWidth="5" opacity="0.55" />
      <path
        d={`M${x - 13} ${tipBase}h26l-13 20z`}
        fill="#E8CFA8"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d={`M${x - 4.5} ${bottom - 9}h9l-4.5 7z`} fill={INK} />
      <rect
        x={x - 13}
        y={top}
        width="26"
        height={tipBase - top}
        rx="3"
        fill="none"
        stroke={INK}
        strokeWidth="3"
      />
      <rect x={x - 13} y={top} width="26" height="12" fill={dark} />
      <rect x={x - 13} y={top} width="26" height="12" fill="none" stroke={INK} strokeWidth="3" />
    </g>
  );
}

function Lapis({ c }: DrawProps) {
  return (
    <g transform="rotate(14 100 100)">
      <PencilShape x={100} color={c.base} dark={c.dark} top={30} bottom={158} />
    </g>
  );
}

function LapisCor({ c }: DrawProps) {
  const trio = [PIECE_COLORS[0]!, PIECE_COLORS[3]!, PIECE_COLORS[1]!];
  return (
    <g>
      <g transform="rotate(-13 66 104)">
        <PencilShape x={66} color={trio[0].base} dark={trio[0].dark} top={44} bottom={162} />
      </g>
      <g transform="rotate(13 134 104)">
        <PencilShape x={134} color={trio[2].base} dark={trio[2].dark} top={44} bottom={162} />
      </g>
      <PencilShape x={100} color={c.base} dark={c.dark} top={34} bottom={166} />
    </g>
  );
}

function Caneta({ c }: DrawProps) {
  return (
    <g transform="rotate(18 100 100)">
      <rect x="86" y="42" width="28" height="94" rx="6" fill={PAPER} />
      <rect x="86" y="42" width="28" height="94" rx="6" fill="none" stroke={INK} strokeWidth="3" />
      <rect x="86" y="42" width="28" height="42" rx="6" fill={c.base} />
      <path d="M86 84h28" stroke={INK} strokeWidth="3" />
      <rect
        x="112"
        y="48"
        width="7"
        height="30"
        rx="3.5"
        fill={c.dark}
        stroke={INK}
        strokeWidth="2.5"
      />
      <path
        d="M86 136h28l-8 16h-12z"
        fill={c.light}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M97 152h6v10h-6z" fill={INK} />
      <path
        d="M92 96h16M92 108h16"
        stroke={INK_SOFT}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </g>
  );
}

function Borracha({ c }: DrawProps) {
  return (
    <g transform="rotate(-12 100 100)">
      <rect x="46" y="68" width="108" height="62" rx="10" fill={PAPER} />
      <rect
        x="46"
        y="68"
        width="108"
        height="62"
        rx="10"
        fill="none"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M46 92h108v22H46z" fill={c.base} />
      <path d="M46 92h108M46 114h108" stroke={INK} strokeWidth="3" />
      <path
        d="M62 99h34M62 107h20"
        stroke={PAPER}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path d="M132 78v42" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.25" />
    </g>
  );
}

function Apontador({ c }: DrawProps) {
  return (
    <g transform="rotate(-8 100 100)">
      <path
        d="M46 74h108a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8V82a8 8 0 0 1 8-8z"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
      />
      <circle cx="74" cy="100" r="15" fill={c.dark} stroke={INK} strokeWidth="3" />
      <circle cx="74" cy="100" r="6" fill={INK} opacity="0.55" />
      <rect
        x="98"
        y="84"
        width="52"
        height="32"
        rx="4"
        fill="#C9D4DC"
        stroke={INK}
        strokeWidth="3"
      />
      <path
        d="M106 92h36M106 100h28"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </g>
  );
}

function Marcador({ c }: DrawProps) {
  return (
    <g transform="rotate(-20 100 100)">
      <rect
        x="76"
        y="46"
        width="48"
        height="76"
        rx="8"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
      />
      <rect x="76" y="46" width="48" height="22" rx="8" fill={c.dark} />
      <path d="M76 68h48" stroke={INK} strokeWidth="3" />
      <path
        d="M82 122h36l6 20-24 14-24-14z"
        fill={c.light}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M76 156h48" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <path
        d="M86 84h28M86 96h20"
        stroke={PAPER}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.75"
      />
    </g>
  );
}

// ─── Arte ────────────────────────────────────────────────────────────────────

function GizCera({ c }: DrawProps) {
  const colors = [PIECE_COLORS[3]!, c, PIECE_COLORS[1]!];
  return (
    <g>
      {colors.map((color, i) => {
        const x = 62 + i * 38;
        const rotate = (i - 1) * 9;
        return (
          <g key={i} transform={`rotate(${rotate} ${x} 100)`}>
            <path
              d={`M${x - 15} 62h30v82a15 15 0 0 1-30 0z`}
              fill={color.base}
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d={`M${x - 15} 46h30v16h-30z`} fill={color.dark} stroke={INK} strokeWidth="3" />
            <path
              d={`M${x} 46l-9-12h18z`}
              fill={color.base}
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d={`M${x - 15} 88h30M${x - 15} 100h30`}
              stroke={PAPER}
              strokeWidth="3"
              opacity="0.6"
            />
          </g>
        );
      })}
    </g>
  );
}

function Canetinha({ c }: DrawProps) {
  const colors = [PIECE_COLORS[2]!, c, PIECE_COLORS[7]!, PIECE_COLORS[6]!];
  return (
    <g>
      {colors.map((color, i) => {
        const x = 50 + i * 34;
        return (
          <g key={i} transform={`translate(0 ${i % 2 === 0 ? 0 : 10})`}>
            <rect
              x={x - 12}
              y="52"
              width="24"
              height="70"
              rx="5"
              fill={PAPER}
              stroke={INK}
              strokeWidth="3"
            />
            <rect x={x - 12} y="52" width="24" height="30" rx="5" fill={color.base} />
            <path d={`M${x - 12} 82h24`} stroke={INK} strokeWidth="3" />
            <path
              d={`M${x - 12} 122h24l-6 18h-12z`}
              fill={color.dark}
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </g>
  );
}

function Tinta({ c }: DrawProps) {
  const colors = [PIECE_COLORS[0]!, PIECE_COLORS[3]!, PIECE_COLORS[2]!, c];
  return (
    <g>
      <rect
        x="34"
        y="96"
        width="132"
        height="58"
        rx="10"
        fill={PAPER}
        stroke={INK}
        strokeWidth="3"
      />
      {colors.map((color, i) => {
        const x = 50 + i * 34;
        return (
          <g key={i}>
            <rect
              x={x - 14}
              y="52"
              width="28"
              height="46"
              rx="4"
              fill={color.light}
              stroke={INK}
              strokeWidth="3"
            />
            <path d={`M${x - 14} 70h28v28h-28z`} fill={color.base} />
            <path d={`M${x - 14} 70h28`} stroke={INK} strokeWidth="3" />
            <rect
              x={x - 17}
              y="44"
              width="34"
              height="12"
              rx="4"
              fill={color.dark}
              stroke={INK}
              strokeWidth="3"
            />
            <ellipse cx={x} cy="126" rx="11" ry="7" fill={color.base} opacity="0.9" />
          </g>
        );
      })}
      <path d="M34 138h132" stroke={INK} strokeWidth="3" opacity="0.2" />
    </g>
  );
}

function Pincel({ c }: DrawProps) {
  return (
    <g transform="rotate(24 100 100)">
      <rect
        x="88"
        y="30"
        width="24"
        height="76"
        rx="6"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
      />
      <rect
        x="85"
        y="104"
        width="30"
        height="26"
        rx="4"
        fill="#B9C6D0"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M92 108v18M100 108v18M108 108v18" stroke={INK} strokeWidth="2" opacity="0.4" />
      <path
        d="M88 130h24l-4 26a8 8 0 0 1-16 0z"
        fill={c.dark}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M96 138v14M104 138v14"
        stroke={PAPER}
        strokeWidth="2.5"
        opacity="0.45"
        strokeLinecap="round"
      />
    </g>
  );
}

function Massinha({ c }: DrawProps) {
  const colors = [PIECE_COLORS[5]!, PIECE_COLORS[3]!, c];
  return (
    <g>
      {colors.map((color, i) => (
        <g key={i} transform={`translate(0 ${i * 30})`}>
          <rect
            x={44 + i * 10}
            y="52"
            width={112 - i * 20}
            height="30"
            rx="15"
            fill={color.base}
            stroke={INK}
            strokeWidth="3"
          />
          <path
            d={`M${58 + i * 10} 62h${52 - i * 12}`}
            stroke={PAPER}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>
      ))}
      <ellipse cx="100" cy="158" rx="58" ry="8" fill={INK} opacity="0.08" />
    </g>
  );
}

// ─── Organização ─────────────────────────────────────────────────────────────

function Mochila({ c }: DrawProps) {
  return (
    <g>
      <path
        d="M74 56h52a10 10 0 0 1 10 10v-6a26 26 0 0 0-72 0v6a10 10 0 0 1 10-10z"
        fill={c.dark}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="48"
        y="60"
        width="104"
        height="102"
        rx="20"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
      />
      <path
        d="M48 88a52 52 0 0 1 104 0v6H48z"
        fill={c.dark}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="72"
        y="106"
        width="56"
        height="40"
        rx="10"
        fill={c.light}
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M72 122h56" stroke={INK} strokeWidth="3" />
      <circle cx="100" cy="122" r="6" fill={PAPER} stroke={INK} strokeWidth="3" />
      <path
        d="M84 68a16 16 0 0 1 32 0"
        fill="none"
        stroke={PAPER}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </g>
  );
}

function Estojo({ c }: DrawProps) {
  return (
    <g>
      <path
        d="M46 78h108a14 14 0 0 1 14 14v42a14 14 0 0 1-14 14H46a14 14 0 0 1-14-14V92a14 14 0 0 1 14-14z"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M32 100h136" stroke={INK} strokeWidth="3" />
      <path d="M32 100h136" stroke={c.dark} strokeWidth="8" opacity="0.35" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${48 + i * 15} 94v12`} stroke={INK} strokeWidth="2.5" opacity="0.45" />
      ))}
      <circle cx="150" cy="100" r="8" fill={PAPER} stroke={INK} strokeWidth="3" />
      <path d="M150 100v14" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M56 120h44" stroke={PAPER} strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

function Pasta({ c }: DrawProps) {
  return (
    <g>
      <path
        d="M50 46h72l30 28v82a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8V54a8 8 0 0 1 8-8z"
        fill={PAPER}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M122 46l30 28h-30z"
        fill={c.light}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M42 118h110" stroke={c.base} strokeWidth="14" />
      <path d="M42 111h110M42 125h110" stroke={INK} strokeWidth="3" />
      <path
        d="M60 88h44M60 100h30"
        stroke={INK_SOFT}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M60 142h60"
        stroke={INK_SOFT}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </g>
  );
}

function Agenda({ c }: DrawProps) {
  return (
    <g>
      <rect x="52" y="36" width="100" height="130" rx="8" fill={c.dark} />
      <rect
        x="46"
        y="30"
        width="100"
        height="130"
        rx="8"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M60 30v130" stroke={INK} strokeWidth="3" opacity="0.35" />
      <rect x="76" y="62" width="46" height="34" rx="5" fill={PAPER} opacity="0.92" />
      <path d="M76 74h46" stroke={c.dark} strokeWidth="3" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={86 + i * 15} cy="86" r="3.5" fill={c.dark} opacity="0.6" />
      ))}
      <path d="M110 30v130" stroke={INK} strokeWidth="6" opacity="0.85" />
      <path
        d="M132 30v46l-10-9-10 9V30z"
        fill={PIECE_COLORS[3]!.base}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ─── Geometria ───────────────────────────────────────────────────────────────

function Regua({ c }: DrawProps) {
  return (
    <g transform="rotate(-28 100 100)">
      <rect
        x="16"
        y="80"
        width="168"
        height="40"
        rx="6"
        fill={c.light}
        stroke={INK}
        strokeWidth="3"
      />
      <rect x="16" y="80" width="168" height="14" rx="6" fill={c.base} />
      <path d="M16 94h168" stroke={INK} strokeWidth="3" />
      {Array.from({ length: 15 }, (_, i) => {
        const x = 26 + i * 11;
        const long = i % 5 === 0;
        return (
          <path
            key={i}
            d={`M${x} 94v${long ? 18 : 10}`}
            stroke={INK}
            strokeWidth={long ? 3 : 2}
            strokeLinecap="round"
            opacity={long ? 0.85 : 0.5}
          />
        );
      })}
    </g>
  );
}

function Compasso({ c }: DrawProps) {
  return (
    <g>
      <path
        d="M100 154a54 54 0 0 0 46-26"
        fill="none"
        stroke={INK_SOFT}
        strokeWidth="3"
        strokeDasharray="7 8"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path d="M100 44L66 156" stroke={c.base} strokeWidth="13" strokeLinecap="round" />
      <path d="M100 44l34 112" stroke={c.dark} strokeWidth="13" strokeLinecap="round" />
      <path d="M100 44L66 156" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.28" />
      <path d="M100 44l34 112" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.28" />
      <path
        d="M62 148l4 16 8-14z"
        fill={INK}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M138 148l-4 16-8-14z"
        fill={PIECE_COLORS[3]!.base}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="44" r="14" fill={PAPER} stroke={INK} strokeWidth="3" />
      <circle cx="100" cy="44" r="5" fill={INK} opacity="0.6" />
      <rect
        x="88"
        y="26"
        width="24"
        height="12"
        rx="6"
        fill={c.base}
        stroke={INK}
        strokeWidth="3"
      />
    </g>
  );
}

// ─── Papelaria ───────────────────────────────────────────────────────────────

function Tesoura({ c }: DrawProps) {
  return (
    <g>
      <path d="M70 34l44 78" stroke="#C9D4DC" strokeWidth="15" strokeLinecap="round" />
      <path d="M130 34L86 112" stroke="#DDE5EA" strokeWidth="15" strokeLinecap="round" />
      <path d="M70 34l44 78" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <path d="M130 34L86 112" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <circle cx="100" cy="112" r="8" fill={INK} />
      <path
        d="M86 112c-18 10-26 22-20 32s22 8 30-6"
        fill="none"
        stroke={c.base}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M114 112c18 10 26 22 20 32s-22 8-30-6"
        fill="none"
        stroke={c.base}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M86 112c-18 10-26 22-20 32s22 8 30-6"
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M114 112c18 10 26 22 20 32s-22 8-30-6"
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
    </g>
  );
}

function Cola({ c }: DrawProps) {
  return (
    <g>
      <rect
        x="72"
        y="70"
        width="56"
        height="92"
        rx="10"
        fill={PAPER}
        stroke={INK}
        strokeWidth="3"
      />
      <rect x="72" y="92" width="56" height="46" fill={c.base} />
      <path d="M72 92h56M72 138h56" stroke={INK} strokeWidth="3" />
      <path
        d="M84 106h32M84 118h20"
        stroke={PAPER}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <rect
        x="78"
        y="34"
        width="44"
        height="38"
        rx="8"
        fill={c.dark}
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M78 60h44" stroke={INK} strokeWidth="3" opacity="0.4" />
      <path d="M72 150h56" stroke={INK} strokeWidth="3" opacity="0.25" />
    </g>
  );
}

// ─── Registro ────────────────────────────────────────────────────────────────

const DRAWINGS: Record<IllustrationKey, (props: DrawProps) => React.JSX.Element> = {
  caderno: Caderno,
  bloco: Bloco,
  papel: Papel,
  lapis: Lapis,
  caneta: Caneta,
  borracha: Borracha,
  apontador: Apontador,
  marcador: Marcador,
  'lapis-cor': LapisCor,
  'giz-cera': GizCera,
  canetinha: Canetinha,
  tinta: Tinta,
  pincel: Pincel,
  massinha: Massinha,
  tesoura: Tesoura,
  cola: Cola,
  regua: Regua,
  compasso: Compasso,
  mochila: Mochila,
  estojo: Estojo,
  pasta: Pasta,
  agenda: Agenda,
};

export function ProductIllustration({
  illustration,
  seed,
  className,
  showGrid = true,
}: {
  illustration: IllustrationKey;
  /** Normalmente o slug: garante a mesma cor em toda aparição do produto. */
  seed: string;
  className?: string;
  showGrid?: boolean;
}) {
  const palette = paletteFor(seed);
  const Drawing = DRAWINGS[illustration];
  const gridId = `grid-${illustration}-${hashSlug(seed) % 1000}`;

  return (
    <svg
      viewBox="0 0 200 200"
      role="presentation"
      aria-hidden="true"
      className={cn('h-full w-full', className)}
    >
      <defs>
        <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0v16" fill="none" stroke={INK} strokeWidth="0.6" opacity="0.09" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill={palette.backdrop} />
      {showGrid ? <rect width="200" height="200" fill={`url(#${gridId})`} /> : null}
      <Drawing c={palette} />
    </svg>
  );
}
