# ===== BUILD STAGE =====
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev

# ===== PRODUCTION STAGE =====
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install necessary production tools
RUN apk add --no-cache tini curl

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Create directory for persistent data with correct permissions
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data
VOLUME /app/data

# Copy production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules /app/node_modules

# Copy build files
COPY --from=builder --chown=nodejs:nodejs /app/build /app/build
COPY --from=builder --chown=nodejs:nodejs /app/public /app/public

# Copy server files needed for runtime
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/package.json
COPY --from=builder --chown=nodejs:nodejs /app/remix.config.js /app/remix.config.js

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use tini as init to handle signals properly
ENTRYPOINT ["/sbin/tini", "--", "/scripts/maxmind-init.sh"]

# Start the server
CMD ["npm", "run", "start"]
