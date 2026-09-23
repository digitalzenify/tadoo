FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# better-sqlite3 ships prebuilt musl/glibc binaries and resolves them at runtime,
# so install scripts are skipped: the alpine image carries no compiler toolchain.
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# 127.0.0.1, not localhost: busybox wget resolves localhost to ::1 first and nginx
# only listens on IPv4, which fails the check and makes the swarm task restart-loop.
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ || exit 1
