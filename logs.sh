#!/bin/bash

# If Docker Compose services in this directory are not up, start them; then follow logs.

if ! sudo docker compose ps | grep -q "Up"; then
  echo "Docker services are not running. Starting them now..."
  sudo docker compose up -d
  echo "Docker services started."
else
  echo "Docker services are already running."
fi

sudo docker compose logs -f
