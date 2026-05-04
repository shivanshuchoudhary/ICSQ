# Use a minimal base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only necessary files to install dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the rest of your app (excluding .dockerignore)
COPY . .

# Expose the server port
EXPOSE 8080

# Start the app
CMD ["node", "src/index.js"]