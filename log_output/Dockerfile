FROM node:20-alpine

WORKDIR /usr/src/app

COPY generator.js reader.js .

ENV PORT=3000
ENV LOG_FILE=/shared/log.txt
EXPOSE 3000
