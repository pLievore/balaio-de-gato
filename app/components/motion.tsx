'use client';

/**
 * Reusable Framer Motion primitives.
 *
 * Content remains visible in the server-rendered HTML. Motion is an enhancement:
 * a slow hydration, blocked script or screenshot crawler must never receive an
 * empty hero or catalog. All movement also respects prefers-reduced-motion.
 */

import { useReducedMotion } from 'framer-motion';
import { motion, type Variants, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

// ─── Shared easing ───────────────────────────────────────────────────────────
export const ease = {
  out: [0.16, 1, 0.3, 1] as const, // snappy out — feels natural
  in: [0.55, 0, 1, 0.45] as const,
  inOut: [0.87, 0, 0.13, 1] as const,
};

// ─── FadeIn ──────────────────────────────────────────────────────────────────
type FadeInProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'span' | 'p' | 'article' | 'header';
};

export function FadeIn({
  children,
  delay = 0,
  distance = 20,
  duration = 0.55,
  className,
  as = 'div',
  ...rest
}: FadeInProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 1, y: reduced ? 0 : distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration, ease: ease.out, delay }}
      className={className}
      {...(rest as object)}
    >
      {children}
    </Tag>
  );
}

// ─── FadeInWhenVisible (alias, no scroll trigger — just mounts) ───────────────
export function FadeMount({
  children,
  delay = 0,
  duration = 0.45,
  className,
}: Omit<FadeInProps, 'as'>) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: ease.out, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger container + item ─────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 1, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
};

const staggerItemFast: Variants = {
  hidden: { opacity: 1, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: ease.out } },
};

type StaggerGridProps = {
  children: ReactNode;
  className?: string;
  fast?: boolean;
};

export function StaggerGrid({ children, className }: StaggerGridProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  fast,
}: {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={fast ? staggerItemFast : staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ─── ScaleIn — for overlays, badges, toasts ──────────────────────────────────
export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.95 }}
      transition={{ duration: 0.3, ease: ease.out, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated button press ───────────────────────────────────────────────────
export function TapButton({
  children,
  className,
  onClick,
  disabled,
  type = 'button',
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileHover={reduced || disabled ? {} : { y: -1, boxShadow: '0 4px 14px rgba(0,0,0,0.10)' }}
      whileTap={reduced || disabled ? {} : { scale: 0.97, y: 0 }}
      transition={{ duration: 0.15, ease: ease.out }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
