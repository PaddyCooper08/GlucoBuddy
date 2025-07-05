FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY . .

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Start the application
CMD ["node", "main.js"]