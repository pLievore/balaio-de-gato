'use client';

/**
 * Contexto de crédito no topo do catálogo.
 *
 * Enquanto o visitante navega com uma etapa escolhida, esta faixa mostra o
 * crédito daquela etapa e quanto o carrinho já ocupa — é a informação que
 * decide se cabe mais um item, e ela precisa estar visível na hora de escolher,
 * não só no fim, no carrinho.
 *
 * Também espelha a etapa da URL no carrinho, para que o mesmo filtro valha na
 * hora de fechar o pedido.
 */

import { useEffect } from 'react';

import { useCartStore } from '../../../src/lib/cart/store';
import type { EducationStage } from '../../../src/lib/program/material-escolar';
import { BenefitMeter } from './benefit-meter';
import { useCartSummary } from './cart-catalog';

export function StageBenefitBanner({
  stage,
  className,
}: {
  stage: EducationStage;
  className?: string;
}) {
  const setStage = useCartStore((state) => state.setStage);
  const summary = useCartSummary();

  useEffect(() => {
    setStage(stage.slug);
  }, [stage.slug, setStage]);

  // Antes da hidratação não há carrinho para medir; mostra o crédito da etapa
  // com a barra zerada em vez de reservar um espaço em branco.
  const subtotalInCents = summary?.subtotalInCents ?? 0;

  return (
    <BenefitMeter
      stage={stage}
      subtotalInCents={subtotalInCents}
      remainingInCents={stage.benefitAmountInCents - subtotalInCents}
      overBudgetInCents={Math.max(0, subtotalInCents - stage.benefitAmountInCents)}
      usedRatio={Math.min(1, subtotalInCents / stage.benefitAmountInCents)}
      className={className}
    />
  );
}
