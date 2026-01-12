import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {},
};

export default withNextIntl(nextConfig);
