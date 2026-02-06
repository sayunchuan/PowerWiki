# PowerWiki Docker Image

## Credits / 致谢

This Docker image is based on [PowerWiki](https://github.com/steven-ld/PowerWiki) by [steven-ld](https://github.com/steven-ld).

本 Docker 镜像基于 [steven-ld](https://github.com/steven-ld) 开发的 [PowerWiki](https://github.com/steven-ld/PowerWiki) 项目构建。

---

## English

A modern Git-based Markdown wiki system with auto-sync, syntax highlighting, and Feishu-style UI.

### Image Version Types

This repository provides two types of Docker images:

**1. Upstream Version (Auto-published from master branch)**

| Tag | Description |
|-----|-------------|
| `latest` | Most recently published image |
| `1.2.0` | Exactly synced with upstream v1.2.0 |
| `20260205` | Build date (YYYYMMDD) |

**2. Fork Version (Manual-published from docker branch)**

| Tag | Description |
|-----|-------------|
| `latest` | Most recently published image |
| `1.2.0-f1` | Based on upstream 1.2.0, 1st local modification |
| `1.2.0-f1-3` | Based on 1.2.0-f1 tag + 3 additional commits |
| `20260205-fork` | Fork version build date |

> Note: `latest` tag always points to the most recently published image, regardless of whether it's an upstream or fork version.

**Version Format:**

- `X.Y.Z` — Exactly synced with upstream release vX.Y.Z
- `X.Y.Z-fN` — Based on upstream X.Y.Z, Nth local modification release
- `X.Y.Z-fN-M` — Based on X.Y.Z-fN tag, with M additional commits

**f = fork**, indicating local modifications (bug fixes, enhancements, etc.)

**Recommended:**
- Need latest upstream features: Use `latest` or specific version like `1.2.0`
- Need local fixes/enhancements: Use `fork-latest` or specific version like `1.2.0-f1`

> For detailed changes in each fork version, see [CHANGELOG.fork.md](CHANGELOG.fork.md).
> Inside the container: `docker exec <container> cat /app/CHANGELOG.fork.md`

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
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
      - GIT_CACHE_DIR=/app/cache
      - LANG=zh-CN
    volumes:
      - ./config.json:/app/config.json
      - powerwiki-data:/app/data
      - powerwiki-cache:/app/cache
    restart: unless-stopped

volumes:
  powerwiki-data:
  powerwiki-cache:
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

### 镜像版本类型

本仓库提供两种类型的 Docker 镜像：

**1. 纯上游版本（自动发布，来自 master 分支）**

| 标签 | 说明 |
|------|------|
| `latest` | 最近发布的镜像 |
| `1.2.0` | 与上游 v1.2.0 完全一致 |
| `20260205` | 构建日期（YYYYMMDD） |

**2. Fork 修改版本（手动发布，来自 docker 分支）**

| 标签 | 说明 |
|------|------|
| `latest` | 最近发布的镜像 |
| `1.2.0-f1` | 基于上游 1.2.0，第 1 次本地修改 |
| `1.2.0-f1-3` | 基于 1.2.0-f1 tag 后又有 3 个提交 |
| `20260205-fork` | Fork 版本的日期标签 |

> 注：`latest` 标签始终指向最近发布的镜像，无论是上游版本还是 Fork 版本。

**版本号格式：**

- `X.Y.Z` — 与上游 vX.Y.Z 发布版本完全同步
- `X.Y.Z-fN` — 基于上游 X.Y.Z，第 N 次本地修改发布
- `X.Y.Z-fN-M` — 基于 X.Y.Z-fN tag，之后有 M 个新提交

**f = fork**，表示包含本地修改（如 Bug 修复、功能增强等）

**推荐选择：**
- 需要最新上游功能：使用 `latest` 或具体版本如 `1.2.0`
- 需要本地修复/增强：使用 `fork-latest` 或具体版本如 `1.2.0-f1`

> 各 fork 版本的详细变更内容请查看 [CHANGELOG.fork.md](CHANGELOG.fork.md)。
> 容器内查看：`docker exec <container> cat /app/CHANGELOG.fork.md`

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
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
      - GIT_CACHE_DIR=/app/cache
      - LANG=zh-CN
    volumes:
      - ./config.json:/app/config.json
      - powerwiki-data:/app/data
      - powerwiki-cache:/app/cache
    restart: unless-stopped

volumes:
  powerwiki-data:
  powerwiki-cache:
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
- Fork Changelog / 变更记录: [CHANGELOG.fork.md](https://github.com/sayunchuan/PowerWiki/blob/docker/CHANGELOG.fork.md)
