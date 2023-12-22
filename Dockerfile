FROM node:16-alpine

RUN mkdir -p /usr/src/inula

COPY ./ /usr/src/inula

WORKDIR /usr/src/inula

RUN npm install -g pnpm

RUN npm install --force

RUN npm install openinula

RUN npm list -g