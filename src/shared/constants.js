// API Base URLs
export const API_BASE = {
  development: "http://127.0.0.1:8787",
  staging: "https://api-staging.chroniclesync.xyz",
  production: "https://api.chroniclesync.xyz",
};

// API Endpoints
export const API_PATHS = {
  health: "/health",
  sync: "/api/sync",
  createGroup: "/api/create-group",
  getUpdates: "/api/get-updates",
};

// API Endpoints for error reporting
export const ERROR_REPORTING_PATHS = {
  reportError: "/api/report-error",
};

// Host patterns for extension manifest
export const HOST_PATTERNS = {
  api: "https://*.chroniclesync.xyz/*",
};

// Helper functions
export function getApiUrl(environment = process.env.NODE_ENV || "development") {
  return API_BASE[environment] || API_BASE.development;
}

export function getFullUrl(path, environment) {
  return `${getApiUrl(environment)}${path}`;
}

// This function is no longer needed since we're using a proxy endpoint
export function getErrorReportingUrl(service, environment = process.env.NODE_ENV || "development") {
  return `${getApiUrl(environment)}${ERROR_REPORTING_PATHS.reportError}`;
}