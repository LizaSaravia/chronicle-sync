# Build stage for TypeScript compilation
FROM node:20-slim AS builder

WORKDIR /app

# Create workspace directories
RUN mkdir -p packages/sync apps/chrome apps/firefox apps/web

# Copy root package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy workspace package files
COPY packages/sync/package*.json packages/sync/
COPY packages/sync/tsconfig*.json packages/sync/
COPY apps/chrome/package*.json apps/chrome/
COPY apps/firefox/package*.json apps/firefox/
COPY apps/web/package*.json apps/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build packages
RUN npm run build:packages

# Production stage
FROM node:20-slim

WORKDIR /app

# Create workspace directories
RUN mkdir -p packages/sync

# Copy package files
COPY package*.json ./
COPY packages/sync/package*.json packages/sync/

# Copy built artifacts
COPY --from=builder /app/packages/sync/dist packages/sync/dist
COPY --from=builder /app/node_modules ./node_modules
COPY server.js ./

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start:server"]