import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { protectJson, protectedLookup, revealJson } from './protected-data';

/**
 * A chave é lida a cada chamada, então dá para trocá-la no meio do teste e
 * observar o efeito — é assim que se verifica que uma rotação sem plano torna
 * o dado existente ilegível.
 *
 * Este arquivo precisa de `--conditions=react-server`: o módulo importa
 * `server-only`, que sem essa condição lança na importação.
 */
const KEY = 'chave-de-teste-com-mais-de-32-bytes-para-o-hmac';

// Fixa a chave para o processo inteiro, mesmo que o ambiente de quem roda
// tenha a variável definida. Cada arquivo de teste roda em processo próprio,
// então não há ambiente de fora para devolver depois.
process.env.ORDER_DATA_ENCRYPTION_KEY = KEY;

afterEach(() => {
  process.env.ORDER_DATA_ENCRYPTION_KEY = KEY;
});

test('o que foi cifrado volta idêntico', () => {
  const cpf = { numero: '390.533.447-05', nome: 'Maria de Souza' };
  const revealed = revealJson<typeof cpf>(protectJson(cpf));
  assert.deepEqual(revealed, cpf);
});

test('o texto claro não aparece no dado protegido', () => {
  const protectedValue = protectJson({ cpf: '39053344705' });
  assert.ok(!protectedValue.includes('39053344705'));
  assert.ok(!protectedValue.includes('cpf'));
});

test('cifrar duas vezes o mesmo CPF dá saídas diferentes', () => {
  // O IV é sorteado a cada chamada. Sem isso, dois pedidos do mesmo
  // responsável teriam o mesmo texto cifrado, e a coluna entregaria de graça
  // quem repetiu compra.
  const primeiro = protectJson({ cpf: '39053344705' });
  const segundo = protectJson({ cpf: '39053344705' });

  assert.notEqual(primeiro, segundo);
  assert.deepEqual(revealJson(primeiro), revealJson(segundo));
});

test('recusa o dado adulterado em vez de devolver lixo', () => {
  const original = protectJson({ cpf: '39053344705' });
  const [version, iv, tag, data] = original.split('.');

  // Um byte trocado no texto cifrado invalida a etiqueta de autenticação.
  const alterado = Buffer.from(data, 'base64url');
  alterado[0] ^= 0xff;
  assert.throws(() => revealJson([version, iv, tag, alterado.toString('base64url')].join('.')));

  // Etiqueta de outro pedido também não serve.
  const outro = protectJson({ cpf: '11144477735' }).split('.')[2];
  assert.throws(() => revealJson([version, iv, outro, data].join('.')));
});

test('recusa formato inválido antes de tentar decifrar', () => {
  assert.throws(() => revealJson(''), /formato de dado protegido inválido/i);
  assert.throws(() => revealJson('v1.só-duas.partes'), /formato de dado protegido inválido/i);
  assert.throws(() => revealJson('v2.a.b.c'), /formato de dado protegido inválido/i);
  assert.throws(() => revealJson('v1.a.b.c.sobrando'), /formato de dado protegido inválido/i);
});

test('o índice cego é estável para o mesmo CPF e diferente para outro', () => {
  // É o que permite achar "os pedidos deste CPF" sem guardar o CPF.
  assert.equal(protectedLookup('39053344705'), protectedLookup('39053344705'));
  assert.notEqual(protectedLookup('39053344705'), protectedLookup('11144477735'));
});

test('o índice cego não é reversível nem carrega o valor original', () => {
  const index = protectedLookup('39053344705');
  assert.match(index, /^[0-9a-f]{64}$/);
  assert.ok(!index.includes('39053344705'));
});

test('trocar a chave torna ilegível o que já estava gravado', () => {
  // O ENV.md avisa: rotação sem plano é perda de dado. Aqui isso vira teste.
  const protectedValue = protectJson({ cpf: '39053344705' });
  const indexAntes = protectedLookup('39053344705');

  process.env.ORDER_DATA_ENCRYPTION_KEY = 'outra-chave-igualmente-longa-com-mais-de-32-bytes';

  assert.throws(() => revealJson(protectedValue));
  assert.notEqual(protectedLookup('39053344705'), indexAntes);
});

test('chave curta demais é recusada na hora de usar', () => {
  process.env.ORDER_DATA_ENCRYPTION_KEY = 'curta-demais';
  assert.throws(() => protectJson({ cpf: '39053344705' }), /ao menos 32 bytes/i);
});
