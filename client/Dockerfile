# Use Node base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app (src, public, etc.)
COPY . .

# Expose Vite's default dev port
EXPOSE 5173

# Start Vite dev server (with hot reload)
CMD ["npm", "run", "dev","--","--host"]