FROM node:24-alpine

RUN apk update && \
    apk add --no-cache python3

ADD docker/entrypoint.sh /
RUN chmod +x /entrypoint.sh

WORKDIR /app
USER node

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
