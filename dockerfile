FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=0 /app/node_modules ./node_modules

COPY . .

RUN mkdir -p logs uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
