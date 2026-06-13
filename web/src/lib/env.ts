export const env = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1',
  WS_BASE_URL: process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:4000',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
} as const;
