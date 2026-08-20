function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  siteUrl: getEnvVar('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
} as const;
