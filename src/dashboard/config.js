const API_BASE = {
  staging: 'https://api-staging.chroniclesync.xyz',
  production: 'https://api.chroniclesync.xyz'
};

export const getApiBase = () => {
  // Check if we're on the staging subdomain
  const isStaging = window.location.hostname === 'dashboard-staging.chroniclesync.xyz';
  return API_BASE[isStaging ? 'staging' : 'production'];
};