#!/bin/bash

# Pull, rebuild, and start Compose in the background; then tail logs (see logs.sh).

cd $(dirname $0)

sudo docker compose down

git pull

sudo docker compose up --build -d &

sleep 5

./logs.sh
