FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY api/package*.json ./api/
COPY workers/package*.json ./workers/
COPY web/package*.json ./web/
RUN npm install
COPY . .
RUN npm run build -w web
CMD ["npm", "run", "start", "-w", "web"]
