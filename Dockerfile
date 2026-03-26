FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate && npm run build



FROM node:24-alpine

WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p ./uploads/photos && chown -R node:node ./uploads

USER node

EXPOSE 3000
CMD ["npm", "run", "start:prod"]

