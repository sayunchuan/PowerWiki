FROM node:18-alpine

# 安装 git、tini（进程管理器）和 su-exec（用户切换）
RUN apk add --no-cache git tini su-exec

# 创建非 root 用户
RUN addgroup -g 1001 powerwiki && \
    adduser -u 1001 -G powerwiki -s /bin/sh -D powerwiki

WORKDIR /app

# 确保 /app 目录权限正确
RUN chown powerwiki:powerwiki /app

# 复制 package 文件并安装依赖
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 创建数据目录并设置权限
RUN mkdir -p /app/data && \
    chown -R powerwiki:powerwiki /app

# 复制入口脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

# 使用 tini 作为 init 进程，entrypoint 会处理用户切换
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
