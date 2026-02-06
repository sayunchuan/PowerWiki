# Fork Changelog

本文件记录 fork 版本相对于上游 [PowerWiki](https://github.com/steven-ld/PowerWiki) 的功能变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 `vX.Y.Z-fN` 规则（详见 [DOCKER.md](DOCKER.md)）。

---

## v1.4.5-f1 (2026-02-06)

基于上游 v1.4.5

### 新功能
- Tag 标签可视化：文章 Frontmatter 中的 tags 字段渲染为彩色胶囊标签
- Tag 页面：Tag 云汇总页 + 单一 Tag 文章列表页，支持前端路由
- Tag API：后端 `/api/ext/tags` 接口，支持增量缓存和标签索引
- Tag 颜色：感知亮度补偿算法，优化亮/暗色模式下所有色相的对比度
- 扩展路由钩子：`app.js` 最小侵入式扩展架构（约 10 行，2 处）
- Fork 变更追踪：新增 `CHANGELOG.fork.md`，Docker 镜像内可查看

### 改进
- Tag 标签支持暗色模式自适应
- 文章列表采用飞书风格卡片设计，右上角展示胶囊标签（最多 3 个 +N）
- 导航栏新增"标签"入口
- Tag 页面自动隐藏右侧目录栏
- 所有 Tag 样式独立为 `tag-page.css`，`styles.css` 零改动

### 架构
- 新增 `public/extensions/` 目录：`tag-feature.js`、`tag-page.js`、`tag-page.css`
- 新增 `src/extensions/` 目录：`index.js`、`tagService.js`
- `window.PowerWikiExtensions` 全局扩展注册机制
- `DOCKER.md` 增加 changelog 引用链接

## v1.4.0-f1 (2026-02-05)

基于上游 v1.4.0

### 新功能
- 文章 Tag 标签可视化展示（初版）

### 修复
- Windows 环境下文件路径反斜杠（`\`）被编码为 `%5C` 导致前端渲染异常

## v1.2.0-f1 (2026-02-05)

基于上游 v1.2.0

### 新功能
- Docker 容器化支持（Dockerfile + docker-compose）
- GitHub Actions 自动构建流水线（`sync-and-build.yml`、`docker-build-fork.yml`）
- OCI 标准镜像标签元数据
- 多架构构建支持（amd64 + arm64）
- `DOCKER.md` 使用文档

### 改进
- `config.json` 支持 bind mount 外部配置
- `.stats.json` 数据持久化

### 修复
- Markdown 内部链接的 URL 编码问题
- Docker 自动化工作流 bug 修复
