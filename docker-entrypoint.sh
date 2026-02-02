#!/bin/sh
set -e

echo "=== PowerWiki Docker Entrypoint ==="

# 1. 以 root 身份修复挂载目录的权限
if [ -d /app/data ]; then
    chown -R powerwiki:powerwiki /app/data 2>/dev/null || true
fi

if [ -f /app/config.json ]; then
    chown powerwiki:powerwiki /app/config.json 2>/dev/null || true
fi

# 确保 /app 目录权限正确（用于创建软链接）
chown powerwiki:powerwiki /app 2>/dev/null || true

# 2. 检查并生成 config.json
if [ ! -f /app/config.json ]; then
    echo "[INFO] config.json not found, creating from template..."
    cp /app/config.example.json /app/config.json
    chown powerwiki:powerwiki /app/config.json
    echo "[INFO] config.json created. Please edit it with your settings."
else
    echo "[INFO] config.json found."
fi

# 3. 确保数据目录存在
mkdir -p /app/data
chown powerwiki:powerwiki /app/data

# 4. 创建统计文件的软链接（如果尚未创建）
if [ ! -L /app/.stats.json ]; then
    # 如果存在旧的统计文件，移动到 data 目录
    if [ -f /app/.stats.json ]; then
        mv /app/.stats.json /app/data/.stats.json
    fi
    rm -f /app/.stats.json 2>/dev/null || true
    ln -sf /app/data/.stats.json /app/.stats.json
    chown -h powerwiki:powerwiki /app/.stats.json 2>/dev/null || true
fi

if [ ! -L /app/.access-log.json ]; then
    if [ -f /app/.access-log.json ]; then
        mv /app/.access-log.json /app/data/.access-log.json
    fi
    rm -f /app/.access-log.json 2>/dev/null || true
    ln -sf /app/data/.access-log.json /app/.access-log.json
    chown -h powerwiki:powerwiki /app/.access-log.json 2>/dev/null || true
fi

# 5. 初始化统计文件（如果不存在）
if [ ! -f /app/data/.stats.json ]; then
    echo '{"totalViews":0,"postViews":{}}' > /app/data/.stats.json
    chown powerwiki:powerwiki /app/data/.stats.json
fi

if [ ! -f /app/data/.access-log.json ]; then
    echo '[]' > /app/data/.access-log.json
    chown powerwiki:powerwiki /app/data/.access-log.json
fi

echo "[INFO] Starting PowerWiki as user 'powerwiki'..."

# 6. 切换到 powerwiki 用户运行应用
exec su-exec powerwiki node server.js
