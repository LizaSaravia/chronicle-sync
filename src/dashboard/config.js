import { API_BASE } from "../shared/constants.js";

export const getApiBase = () => {
  // Check if we're on staging (Cloudflare Pages preview deployment or custom domain)
  const isStaging = window.location.hostname.includes(
    "preview.chronicle-sync.pages.dev",
  );
  return API_BASE[isStaging ? "staging" : "production"];
};
