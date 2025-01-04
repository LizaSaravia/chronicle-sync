# Build stage for TypeScript compilation
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files for workspaces
COPY package*.json ./
COPY packages/*/package*.json ./packages/
COPY apps/*/package*.json ./apps/
COPY tsconfig*.json ./
COPY packages/*/tsconfig*.json ./packages/
COPY apps/*/tsconfig*.json ./apps/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build packages
RUN npm run build:packages

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and built artifacts
COPY package*.json ./
COPY packages/*/package*.json ./packages/
COPY --from=builder /app/packages/sync/dist ./packages/sync/dist
COPY --from=builder /app/node_modules ./node_modules
COPY server.js ./

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start:server"]