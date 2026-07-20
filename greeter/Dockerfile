FROM node:20-alpine
WORKDIR /usr/src/app
COPY index.js .
ENV PORT=3000
ENV VERSION=1
EXPOSE 3000
USER node
CMD ["node", "index.js"]
