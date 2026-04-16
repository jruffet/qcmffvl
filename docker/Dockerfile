FROM node:24-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip gosu tini && \
    rm -rf /var/lib/apt/lists/*

ADD docker/entrypoint.sh /
RUN chmod +x /entrypoint.sh

WORKDIR /app

ENV PATH="/home/node/.local/bin:${PATH}"

EXPOSE 3000

# Use tini as init process to handle signal forwarding and zombie reaping
ENTRYPOINT ["tini", "--", "/entrypoint.sh"]
