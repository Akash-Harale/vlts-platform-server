# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Expose the app port
EXPOSE 3006

# Start the app directly
CMD ["node", "server.js"]