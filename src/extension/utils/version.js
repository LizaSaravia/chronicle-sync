// Version and git hash are injected during build
export const VERSION = process.env.VERSION || '1.1.0';  // Fallback to package.json version
export const GIT_HASH = process.env.GIT_HASH || 'development';