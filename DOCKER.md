# PowerWiki Docker Image

## Credits / 致谢

This Docker image is based on [PowerWiki](https://github.com/steven-ld/PowerWiki) by [steven-ld](https://github.com/steven-ld).

本 Docker 镜像基于 [steven-ld](https://github.com/steven-ld) 开发的 [PowerWiki](https://github.com/steven-ld/PowerWiki) 项目构建。

---

## English

A modern Git-based Markdown wiki system with auto-sync, syntax highlighting, and Feishu-style UI.

### Quick Start

```bash
docker run -d -p 3000:3000 sayunchuan/powerwiki
```

Visit http://localhost:3000

### Configuration

**Mount config.json:**

```bash
docker run -d -p 3000:3000 \
  -v /path/to/config.json:/app/config.json \
  sayunchuan/powerwiki
```

**Persist statistics data:**

```bash
docker run -d -p 3000:3000 \
  -v /path/to/config.json:/app/config.json \
  -v /path/to/data:/app/data \
  sayunchuan/powerwiki
```

### Docker Compose

```yaml
version: '3.8'
services:
  powerwiki:
    image: sayunchuan/powerwiki:latest
    ports:
      - "3000:3000"
    volumes:
      - ./config.json:/app/config.json
      - powerwiki-data:/app/data
    restart: unless-stopped

volumes:
  powerwiki-data:
```

### Configuration File

Create config.json:

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3000,
  "siteTitle": "My Wiki",
  "siteDescription": "Knowledge Base"
}
```

### Container Info

- Port: 3000
- User: powerwiki (UID 1001)
- Data directory: /app/data

---

## 中文

一个现代化的基于 Git 的 Markdown 知识库系统，支持自动同步、语法高亮和飞书风格界面。

### 快速开始

```bash
docker run -d -p 3000:3000 sayunchuan/powerwiki
```

访问 http://localhost:3000

### 配置方式

**挂载配置文件：**

```bash
docker run -d -p 3000:3000 \
  -v /路径/config.json:/app/config.json \
  sayunchuan/powerwiki
```

**持久化统计数据：**

```bash
docker run -d -p 3000:3000 \
  -v /路径/config.json:/app/config.json \
  -v /路径/data:/app/data \
  sayunchuan/powerwiki
```

### Docker Compose 示例

```yaml
version: '3.8'
services:
  powerwiki:
    image: sayunchuan/powerwiki:latest
    ports:
      - "3000:3000"
    volumes:
      - ./config.json:/app/config.json
      - powerwiki-data:/app/data
    restart: unless-stopped

volumes:
  powerwiki-data:
```

### 配置文件说明

创建 config.json：

```json
{
  "gitRepo": "https://github.com/用户名/仓库.git",
  "repoBranch": "main",
  "port": 3000,
  "siteTitle": "我的知识库",
  "siteDescription": "知识库描述"
}
```

### 容器信息

- 端口：3000
- 运行用户：powerwiki (UID 1001)
- 数据目录：/app/data

---

## Links / 链接

- Source / 源码: [steven-ld/PowerWiki](https://github.com/steven-ld/PowerWiki)
- Docker Fork: [sayunchuan/PowerWiki](https://github.com/sayunchuan/PowerWiki)
