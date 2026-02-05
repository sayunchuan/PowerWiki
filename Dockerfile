FROM node:18-alpine

# 构建参数（用于动态注入版本信息）
ARG VERSION=latest
ARG BUILD_DATE
ARG VCS_REF

# OCI 标准标签
LABEL org.opencontainers.image.title="PowerWiki"
LABEL org.opencontainers.image.description="A modern Git-based Markdown wiki system"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.source="https://github.com/sayunchuan/PowerWiki"
LABEL org.opencontainers.image.url="https://hub.docker.com/r/sayunchuan/powerwiki"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.base.name="node:18-alpine"

# 设置工作目录
WORKDIR /app

# 安装 git（用于仓库同步）和 wget（用于健康检查）
RUN apk add --no-cache git wget

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖（使用 npm install 因为没有 package-lock.json）
RUN npm install --omit=dev

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p /app/data /app/cache

# 设置环境变量
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV GIT_CACHE_DIR=/app/cache
ENV CONFIG_PATH=/app/config.json

# 暴露端口
EXPOSE 3150

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3150/ || exit 1

# 启动应用
CMD ["npm", "start"]
