FROM node:18-alpine

WORKDIR /app

# 安装 git（项目需要用到 simple-git）
RUN apk add --no-cache git

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
