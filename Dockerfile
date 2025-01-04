# Build stage for TypeScript compilation
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build packages and server
RUN npm run build:packages
RUN npm run build:server

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and built artifacts
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start:server"]