const API_BASE = {
  staging: 'https://api-staging.chroniclesync.xyz',
  production: 'https://api.chroniclesync.xyz'
};

export const getApiBase = () => {
  // Check if we're on staging (Cloudflare Pages preview deployment or custom domain)
  const isStaging = window.location.hostname.includes('staging.chronicle-sync.pages.dev') ||
                   window.location.hostname.includes('preview.chronicle-sync.pages.dev') ||
                   window.location.hostname.includes('dashboard-staging.chroniclesync.xyz') ||
                   window.location.hostname.includes('-staging.');
  return API_BASE[isStaging ? 'staging' : 'production'];
};