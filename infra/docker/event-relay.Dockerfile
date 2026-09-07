FROM node:22-alpine
WORKDIR /app
COPY services/event-relay/package*.json ./
RUN npm install --omit=dev
COPY services/event-relay/src ./src
CMD ["npm","start"]
