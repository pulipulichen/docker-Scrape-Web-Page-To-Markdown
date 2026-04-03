# Runtime deps are installed at image build time (npm install below); no npm install on the host.
FROM pudding/docker-image-base:action-RSS-Fulltext-Docker-Image-20251004.130038

RUN rm /etc/apt/sources.list.d/google.list || true
RUN apt-get update

RUN apt-get install -y \
    locales \
    git \
    nano \
    wget \
 && rm -rf /var/lib/apt/lists/*

RUN locale-gen zh_TW.UTF-8
ENV LC_ALL=zh_TW.UTF-8

# Image already has google-chrome-stable; skip Puppeteer’s Chromium download and use system Chrome.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Compose mounts ./app → /app; node_modules stay in the image at / and resolve above /app.

CMD ["node", "/app/index.js"]
