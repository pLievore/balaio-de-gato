/**
 * CPF do responsável.
 *
 * O documento fiscal da compra do benefício sai no CPF do responsável, então
 * um número digitado errado só apareceria como problema na hora de emitir a
 * nota. Validar o dígito verificador aqui pega a maior parte dos erros de
 * digitação antes de o pedido existir.
 *
 * Isto confere a estrutura do número, não a existência dele na Receita.
 */

export function stripCPF(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCPF(value: string): string {
  const digits = stripCPF(value).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  const check = digits.slice(9, 11);
  const base = parts.join('.');
  return check ? `${base}-${check}` : base;
}

/** Mostra apenas os três dígitos do meio: o bastante para o responsável se reconhecer. */
export function maskCPF(value: string): string {
  const digits = stripCPF(value);
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.***-**`;
}

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += Number(digits[i]) * (length + 1 - i);
  }
  const remainder = (sum * 10) % 11;
  // 10 e 11 valem zero — é a regra da Receita, não um arredondamento.
  return remainder === 10 || remainder === 11 ? 0 : remainder;
}

export function isValidCPF(value: string): boolean {
  const digits = stripCPF(value);
  if (digits.length !== 11) return false;

  // Sequências repetidas passam na conta dos dígitos, mas nenhuma é um CPF real.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  return (
    checkDigit(digits, 9) === Number(digits[9]) && checkDigit(digits, 10) === Number(digits[10])
  );
}

export function stripCEP(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCEP(value: string): string {
  const digits = stripCEP(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function isValidCEP(value: string): boolean {
  return /^\d{8}$/.test(stripCEP(value));
}

export function stripPhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string): string {
  const digits = stripPhone(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  // Celular tem nove dígitos e quebra depois do quinto; fixo tem oito.
  const split = rest.length > 8 ? 5 : 4;
  return rest.length > split
    ? `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`
    : `(${area}) ${rest}`;
}

export function isValidPhone(value: string): boolean {
  return /^\d{10,11}$/.test(stripPhone(value));
}
