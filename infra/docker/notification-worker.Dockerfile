FROM node:22-alpine
WORKDIR /app
COPY services/notification-worker/package.json ./package.json
RUN npm install
COPY services/notification-worker/src ./src
CMD ["npm","start"]
