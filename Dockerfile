FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps needed for server imports)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the backend only
CMD ["node", "server/index.js"]
