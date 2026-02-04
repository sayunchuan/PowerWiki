# PowerWiki Docker Image

## Credits / 致谢

This Docker image is based on [PowerWiki](https://github.com/steven-ld/PowerWiki) by [steven-ld](https://github.com/steven-ld).

本 Docker 镜像基于 [steven-ld](https://github.com/steven-ld) 开发的 [PowerWiki](https://github.com/steven-ld/PowerWiki) 项目构建。

---

## English

A modern Git-based Markdown wiki system with auto-sync, syntax highlighting, and Feishu-style UI.

### Quick Start

```bash
docker run -d -p 3150:3150 sayunchuan/powerwiki
```

Visit http://localhost:3150

### Configuration

**Mount config.json:**

```bash
docker run -d -p 3150:3150 \
  -v /path/to/config.json:/app/config.json \
  sayunchuan/powerwiki
```

**Persist statistics data:**

```bash
docker run -d -p 3150:3150 \
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
      - "3150:3150"
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
  "port": 3150,
  "siteTitle": "My Wiki",
  "siteDescription": "Knowledge Base"
}
```

### Container Info

- Port: 3150
- User: root
- Data directory: /app/data
- Git cache directory: /app/cache

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| CONFIG_PATH | /app/config.json | Path to configuration file |
| DATA_DIR | /app/data | Directory for stats and logs |
| GIT_CACHE_DIR | /app/cache | Git repository cache directory |
| LANG | zh-CN | Console output language (zh-CN, en) |

### Important Notes

- config.json must exist before starting the container
- Use environment variables to customize data paths

---

## 中文

一个现代化的基于 Git 的 Markdown 知识库系统，支持自动同步、语法高亮和飞书风格界面。

### 快速开始

```bash
docker run -d -p 3150:3150 sayunchuan/powerwiki
```

访问 http://localhost:3150

### 配置方式

**挂载配置文件：**

```bash
docker run -d -p 3150:3150 \
  -v /路径/config.json:/app/config.json \
  sayunchuan/powerwiki
```

**持久化统计数据：**

```bash
docker run -d -p 3150:3150 \
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
      - "3150:3150"
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
  "port": 3150,
  "siteTitle": "我的知识库",
  "siteDescription": "知识库描述"
}
```

### 容器信息

- 端口：3150
- 运行用户：root
- 数据目录：/app/data
- Git 缓存目录：/app/cache

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| CONFIG_PATH | /app/config.json | 配置文件路径 |
| DATA_DIR | /app/data | 统计数据和日志存储目录 |
| GIT_CACHE_DIR | /app/cache | Git 仓库缓存目录 |
| LANG | zh-CN | 控制台输出语言（zh-CN、en） |

### 重要说明

- config.json 必须在启动容器前存在
- 可通过环境变量自定义数据存储路径

---

## Links / 链接

- Source / 源码: [steven-ld/PowerWiki](https://github.com/steven-ld/PowerWiki)
- Docker Fork: [sayunchuan/PowerWiki](https://github.com/sayunchuan/PowerWiki)
