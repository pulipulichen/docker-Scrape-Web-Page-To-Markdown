#Specify the version of nodejs.
# FROM zenato/puppeteer-renderer
#FROM dayyass/muse_as_service:1.1.2
FROM buildkite/puppeteer

RUN rm /etc/apt/sources.list.d/google.list
RUN apt-get update

# RUN cat /etc/os-release

RUN apt-get install -y \
    fonts-noto-cjk locales

RUN locale-gen zh_TW.UTF-8  
ENV LC_ALL=zh_TW.UTF-8

RUN mkdir -p /app/
# RUN mkdir -p /1.input/
# RUN mkdir -p /2.output/

# RUN npm install text-from-image@1.1.1
# RUN npm install smartcrop@2.0.5
# RUN npm install smartcrop-gm@2.0.2
# RUN npm install gm@1.25.0
RUN npm i request

# RUN apt-get install imagemagick -y

RUN npm i tree-kill@1.2.2

# RUN apt-get install -y python
# RUN apt-get install -y python3-opencv

RUN apt-get install -y git nano wget
# RUN git clone https://github.com/johnlinp/meme-ocr.git
# # RUN wget https://i.imgur.com/YzMXGdQ.jpg
# RUN apt install tesseract-ocr -y
# RUN apt install libtesseract-dev -y
# RUN /meme-ocr/main.py YzMXGdQ.jpg

# RUN mkdir -p /3.cache/

COPY package.json /
RUN npm i

# WORKDIR /app

CMD ["node", "/app/index.js"]