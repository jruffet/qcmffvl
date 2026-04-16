#!/bin/bash
set -eou pipefail

# named volumes
chown node:node /app/web/generated
chown node:node /app/dist
chown node:node /app/node_modules

gosu node pip install --break-system-packages -r /app/requirements.txt

gosu node npm install
exec gosu node npm run dev
