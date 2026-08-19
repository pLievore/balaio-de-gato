'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  ExternalLink,
  Filter,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Store,
  X,
  type LucideIcon,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: 'Operação',
    items: [
      { href: '/admin', label: 'Visão geral', icon: LayoutDashboard },
      { href: '/admin/orders', label: 'Pedidos', icon: ReceiptText },
      { href: '/admin/funnel', label: 'Funil', icon: Filter },
      { href: '/admin/sales', label: 'Vendas', icon: LineChart },
    ],
  },
  {
    title: 'Catálogo',
    items: [{ href: '/admin/products', label: 'Produtos', icon: Package }],
  },
];

/*
 * A autoria de catálogo (novo produto, edição, importação) saiu junto com a
 * integração antiga. Ela volta escrita sobre o PostgreSQL, depois que o
 * catálogo oficial substituir o seed de desenvolvimento.
 */

const ALL_ITEMS = NAV.flatMap((group) => group.items);

const STOREFRONT_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balaio-de-gato.vercel.app';

function bestMatch(pathname: string): string | null {
  let winner: string | null = null;
  for (const item of ALL_ITEMS) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (winner === null || item.href.length > winner.length)) {
      winner = item.href;
    }
  }
  return winner;
}

export function AdminShell({
  children,
  signOut,
}: {
  children: ReactNode;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // Close the mobile drawer on navigation (state adjustment during render).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (drawer) setDrawer(false);
  }

  const activeHref = bestMatch(pathname);
  const currentLabel = ALL_ITEMS.find((item) => item.href === activeHref)?.label ?? 'Panel';

  const sidebarBody = (
    <>
      <Link href="/admin" className="flex items-center gap-3 px-5 py-6">
        <span className="relative size-10 overflow-hidden rounded-xl ring-1 ring-white/15 ring-inset">
          <Image src="/brand/balaio-mark.svg" alt="" fill sizes="40px" priority />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-white">Balaio de Gato</p>
          <p className="text-[11px] text-white/50">Painel da loja</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Navegação do painel">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/55 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="panel-nav-active"
                        className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-[#a9bd95]"
                      />
                    ) : null}
                    <item.icon
                      aria-hidden="true"
                      className={`size-[18px] shrink-0 transition ${
                        active ? 'text-[#a9bd95]' : 'text-white/40 group-hover:text-white/80'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
            Links
          </p>
          <div className="space-y-0.5">
            <a
              href={STOREFRONT_URL}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              <Store
                aria-hidden="true"
                className="size-[18px] shrink-0 text-white/40 transition group-hover:text-white/80"
              />
              Ver a loja
              <ExternalLink aria-hidden="true" className="ml-auto size-3.5 text-white/30" />
            </a>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[#a9bd95] ring-1 ring-white/15 ring-inset">
            OP
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-white">Operação da loja</p>
            <p className="text-[10px] text-white/45">Sessão ativa</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Sair"
              className="flex size-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="sr-only">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-[rgb(var(--bg))]">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-[#171c17] lg:flex">
        {sidebarBody}
      </aside>

      <AnimatePresence>
        {drawer ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#171c17] lg:hidden"
            >
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Fechar menu"
                className="absolute top-4 right-3 flex size-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden="true" className="size-[18px]" />
              </button>
              {sidebarBody}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Abrir menu"
              className="flex size-9 items-center justify-center rounded-lg border border-[rgb(var(--border-strong))] transition hover:bg-[rgb(var(--surface-muted))] lg:hidden"
            >
              <Menu aria-hidden="true" className="size-[18px]" />
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-[rgb(var(--muted))]">Painel</span>
              <ChevronRight aria-hidden="true" className="size-3.5 text-[rgb(var(--muted))]/60" />
              <span className="font-semibold">{currentLabel}</span>
            </div>
          </div>
          <a
            href={STOREFRONT_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-[rgb(var(--border-strong))] px-3.5 py-1.5 text-xs font-semibold text-[rgb(var(--muted))] transition hover:border-[rgb(var(--fg))] hover:text-[rgb(var(--fg))] sm:inline-flex"
          >
            View store
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
