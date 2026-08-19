import 'server-only';
import { Resend } from 'resend';
import { formatUsdCents } from './format';

type ResendConfig = {
  apiKey: string;
  from: string;
};

function readConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function isEmailConfigured(): boolean {
  return readConfig() !== null;
}

let _client: Resend | null = null;

function getClient(config: ResendConfig): Resend {
  if (_client) return _client;
  _client = new Resend(config.apiKey);
  return _client;
}

export type OrderConfirmationPayload = {
  orderNumber: number;
  to: string;
  customerName: string | null;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
};

export async function sendOrderConfirmation(
  payload: OrderConfirmationPayload,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const config = readConfig();
  if (!config) {
    return { ok: false, reason: 'email_not_configured' };
  }

  const client = getClient(config);
  const subject = `Order #${payload.orderNumber} — 801 Outlet`;

  const { error } = await client.emails.send({
    from: config.from,
    to: payload.to,
    subject,
    html: renderOrderConfirmationHtml(payload),
    text: renderOrderConfirmationText(payload),
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

function renderOrderConfirmationText(p: OrderConfirmationPayload): string {
  const lines = [
    `Order #${p.orderNumber} — 801 Outlet`,
    '',
    `Hi${p.customerName ? ` ${p.customerName}` : ''},`,
    '',
    'Thanks for your order. We received your payment and will reach out within 24–48 hours to schedule your Utah delivery window.',
    '',
    'Items:',
    ...p.items.map(
      (i) =>
        `  • ${i.productName} (${i.sku}) × ${i.quantity} — ${formatUsdCents(i.lineTotalCents)}`,
    ),
    '',
    `Subtotal: ${formatUsdCents(p.subtotalCents)}`,
    `Shipping: ${formatUsdCents(p.shippingCents)}`,
    `Tax:      ${formatUsdCents(p.taxCents)}`,
    `Total:    ${formatUsdCents(p.totalCents)}`,
    '',
    '— 801 Outlet',
  ];
  return lines.join('\n');
}

function renderOrderConfirmationHtml(p: OrderConfirmationPayload): string {
  const itemsHtml = p.items
    .map(
      (i) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600;color:#111;">${escapeHtml(i.productName)}</div>
            <div style="font-size:12px;color:#6b7280;">SKU: ${escapeHtml(i.sku)} • Qty ${i.quantity}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">
            ${formatUsdCents(i.lineTotalCents)}
          </td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Order #${p.orderNumber}</title></head>
<body style="margin:0;padding:0;background:#faf8f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0c161f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">
        <tr><td>
          <div style="font-size:11px;letter-spacing:.22em;color:#6b7280;font-weight:600;">801 OUTLET</div>
          <h1 style="margin:8px 0 0;font-size:24px;">Order #${p.orderNumber} confirmed</h1>
          <p style="color:#6b7280;font-size:14px;line-height:1.5;">
            Hi${p.customerName ? ` ${escapeHtml(p.customerName)}` : ''}, thanks for your order.
            We received your payment and will reach out within 24–48 hours to schedule your Utah delivery window.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;font-size:14px;">
            ${itemsHtml}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
            <tr><td style="color:#6b7280;">Subtotal</td><td align="right">${formatUsdCents(p.subtotalCents)}</td></tr>
            <tr><td style="color:#6b7280;">Shipping</td><td align="right">${formatUsdCents(p.shippingCents)}</td></tr>
            <tr><td style="color:#6b7280;">Tax</td><td align="right">${formatUsdCents(p.taxCents)}</td></tr>
            <tr><td style="font-weight:600;padding-top:8px;border-top:1px solid #e5e7eb;">Total</td>
                <td align="right" style="font-weight:600;padding-top:8px;border-top:1px solid #e5e7eb;">${formatUsdCents(p.totalCents)}</td></tr>
          </table>

          <p style="color:#6b7280;font-size:12px;margin-top:32px;">
            Delivery available in Utah only.<br />
            Need help? Reply to this email or call us.
          </p>
        </td></tr>
      </table>
      <p style="color:#9ca3af;font-size:11px;margin-top:16px;">© 801 Outlet</p>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
