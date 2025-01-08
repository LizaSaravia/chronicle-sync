export const API_BASE = {
  development: "http://127.0.0.1:8787",
  staging: "https://api-staging.chroniclesync.xyz",
  production: "https://api.chroniclesync.xyz",
};

export const API_PATHS = {
  health: "/health",
  sync: "/api/sync",
  createGroup: "/api/create-group",
  getUpdates: "/api/get-updates",
};

export function getApiUrl(environment = process.env.NODE_ENV || "development") {
  return API_BASE[environment] || API_BASE.development;
}

export function getFullUrl(path, environment) {
  return `${getApiUrl(environment)}${path}`;
}