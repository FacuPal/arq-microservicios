# Primero hacemos gneramos el build
FROM node:22-bullseye AS build

ENV AUTH_SERVICE_URL=http://host.docker.internal:3000/v1/
ENV CART_SERVICE_URL=http://host.docker.internal:3003/v1/
ENV CATALOG_SERVICE_URL=http://host.docker.internal:3002/v1/
ENV IMAGE_SERVICE_URL=http://host.docker.internal:3001/v1/
ENV ORDER_SERVICE_URL=http://host.docker.internal:3004/v1/

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
RUN curl -L https://github.com/nmarsollier/ecommerce_api_client_react/archive/refs/heads/master.tar.gz | tar xz --strip=1
RUN npm install
RUN npm run build

# Levantamos el contenido estatico con Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]