import assert from 'node:assert/strict';
import test from 'node:test';

import { EDUCATION_STAGES, formatBRL, getEducationStage } from './material-escolar';

test('program stages have unique slugs and positive amounts', () => {
  const slugs = EDUCATION_STAGES.map((stage) => stage.slug);

  assert.equal(new Set(slugs).size, EDUCATION_STAGES.length);
  assert.ok(
    EDUCATION_STAGES.every(
      (stage) => Number.isInteger(stage.benefitAmountInCents) && stage.benefitAmountInCents > 0,
    ),
  );
});

test('finds a stage by slug', () => {
  assert.equal(getEducationStage('alfabetizacao')?.benefitAmountInCents, 34_617);
  assert.equal(getEducationStage('nao-existe'), undefined);
});

test('formats amounts in Brazilian reais', () => {
  assert.match(formatBRL(42_292), /R\$\s?422,92/);
});
