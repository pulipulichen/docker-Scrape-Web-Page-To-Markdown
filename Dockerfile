# 執行期依賴一律在映像建置時安裝（見下方 npm install），無需在主機執行 npm install。
FROM buildkite/puppeteer

RUN rm /etc/apt/sources.list.d/google.list
RUN apt-get update

RUN apt-get install -y \
    fonts-noto-cjk \
    locales \
    git \
    nano \
    wget \
 && rm -rf /var/lib/apt/lists/*

RUN locale-gen zh_TW.UTF-8
ENV LC_ALL=zh_TW.UTF-8

# 映像已含 google-chrome-stable；跳過 Puppeteer 再下載一份 Chromium，改走系統瀏覽器。
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# 程式碼透過 compose 掛載 ./app → /app；模組留在映像的 /node_modules，由 Node 從 /app 往上解析。

CMD ["node", "/app/index.js"]
