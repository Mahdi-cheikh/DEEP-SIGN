FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Template config — nginx's default entrypoint substitutes env vars at startup
# (BACKEND_URL, PORT) and writes the rendered file to /etc/nginx/conf.d/.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Render sets $PORT; fall back to 80 for local docker-compose.
# BACKEND_URL is the backend's full URL — overridden via Render env vars in prod.
ENV PORT=80
ENV BACKEND_URL=http://backend:8000

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
