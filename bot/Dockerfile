FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build TypeScript
RUN npm run build

# Create volume directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]