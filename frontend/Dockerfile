# syntax=docker/dockerfile:1.8

FROM node:20.17.0-alpine3.20 AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
RUN npm ci

COPY frontend ./
RUN npm run build

FROM nginx:1.27.2-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
