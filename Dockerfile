
FROM node:10.15-alpine

WORKDIR /var/app

COPY package*.json ./

RUN npm install -g pm2

RUN apk add --no-cache make gcc g++ python && \
  npm install && \
  apk del make gcc g++ python

COPY ./ /var/app

RUN npm run build 


CMD npm start