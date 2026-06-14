FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist /app/built
CMD ["sh", "-c", "cp -a /app/built/. /app/dist/ && echo 'Frontend listo en /app/dist' && sleep infinity"]
