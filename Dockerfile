FROM node:24-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

COPY drizzle ./drizzle

EXPOSE 3001

CMD ["node", "dist/index.js"]