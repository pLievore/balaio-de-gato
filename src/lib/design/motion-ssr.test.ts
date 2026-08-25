import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('essential motion primitives keep their initial content visible', () => {
  const source = readFileSync(join(process.cwd(), 'app/components/motion.tsx'), 'utf8');

  assert.match(source, /initial=\{false\}/);
  assert.match(source, /hidden:\s*\{\s*opacity:\s*1,\s*y:/);
  assert.match(source, /initial=\{\{\s*opacity:\s*1,\s*y:/);
});
