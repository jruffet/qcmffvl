FROM node:24-alpine

RUN apk update && \
    apk add --no-cache python3

WORKDIR /app

USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]
