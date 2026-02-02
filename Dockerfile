FROM node:18-alpine

# 安装 git 和 tini（进程管理器）
RUN apk add --no-cache git tini

WORKDIR /app

# 复制 package 文件并安装依赖
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 复制入口脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

# 使用 tini 作为 init 进程
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
