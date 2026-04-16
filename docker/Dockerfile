FROM node:24-alpine

RUN apk add --no-cache python3 py3-pip gosu tini

ADD docker/entrypoint.sh /
RUN chmod +x /entrypoint.sh

WORKDIR /app

ENV PATH="/home/node/.local/bin:${PATH}"

EXPOSE 3000

# Use tini as init process to handle signal forwarding and zombie reaping
ENTRYPOINT ["tini", "--", "/entrypoint.sh"]
