FROM node:10.15-alpine

WORKDIR /var/app

COPY package*.json ./

COPY ./ /var/app

CMD npm run dev