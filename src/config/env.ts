function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  siteUrl: getEnvVar('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
  phoneE164: getEnvVar('NEXT_PUBLIC_PHONE_E164', ''),

  getPhoneHref: () => `tel:${env.phoneE164.replace(/[^+\d]/g, '')}`,

  /**
   * Text-message link. The `?&body=` spelling is deliberate: iOS and Android
   * disagree on the separator, and this form is the one both accept.
   */
  getSmsHref: (body?: string) => {
    const number = env.phoneE164.replace(/[^+\d]/g, '');
    return body ? `sms:${number}?&body=${encodeURIComponent(body)}` : `sms:${number}`;
  },
} as const;
