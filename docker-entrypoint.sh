#!/bin/sh
set -e

echo "=== PowerWiki Docker Entrypoint ==="

# 1. 检查并生成 config.json
if [ ! -f /app/config.json ]; then
    echo "[INFO] config.json not found, creating from template..."
    cp /app/config.example.json /app/config.json
    echo "[INFO] config.json created. Please edit it with your settings."
else
    echo "[INFO] config.json found."
fi

# 2. 确保数据目录存在
mkdir -p /app/data

# 3. 创建统计文件的软链接（如果尚未创建）
if [ ! -L /app/.stats.json ]; then
    # 如果存在旧的统计文件，移动到 data 目录
    if [ -f /app/.stats.json ]; then
        mv /app/.stats.json /app/data/.stats.json
    fi
    rm -f /app/.stats.json 2>/dev/null || true
    ln -sf /app/data/.stats.json /app/.stats.json
fi

if [ ! -L /app/.access-log.json ]; then
    if [ -f /app/.access-log.json ]; then
        mv /app/.access-log.json /app/data/.access-log.json
    fi
    rm -f /app/.access-log.json 2>/dev/null || true
    ln -sf /app/data/.access-log.json /app/.access-log.json
fi

# 4. 初始化统计文件（如果不存在）
if [ ! -f /app/data/.stats.json ]; then
    echo '{"totalViews":0,"postViews":{}}' > /app/data/.stats.json
fi

if [ ! -f /app/data/.access-log.json ]; then
    echo '[]' > /app/data/.access-log.json
fi

echo "[INFO] Starting PowerWiki..."

# 5. 启动应用
exec node server.js
