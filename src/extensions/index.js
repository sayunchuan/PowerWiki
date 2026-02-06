/**
 * Extensions Entry
 *
 * 扩展功能入口模块
 * 注册所有扩展路由，与上游代码解耦
 *
 * @module extensions
 */

const express = require('express');
const TagService = require('./tagService');

/**
 * 注册所有扩展路由
 * @param {Object} app - Express 应用实例
 * @param {Object} options - 配置选项
 * @param {Object} options.gitManager - Git 管理器
 * @param {Object} options.config - 网站配置
 * @param {Object} options.cacheManager - 缓存管理器
 */
function registerExtensions(app, options) {
  const router = express.Router();
  const tagService = new TagService(options);

  // GET /api/ext/tags - 获取 Tag 索引
  router.get('/tags', async (req, res) => {
    try {
      const since = req.query.since;
      const data = await tagService.getTagIndex();

      // 增量更新：如果客户端有缓存且未变化，返回 changed: false
      if (since && new Date(since) >= new Date(data.lastUpdated)) {
        return res.json({ changed: false });
      }

      res.json(data);
    } catch (error) {
      console.error('❌ 获取 Tag 索引失败:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/ext/tags/:tagName - 获取某 Tag 下的文章
  router.get('/tags/:tagName', async (req, res) => {
    try {
      const tagName = decodeURIComponent(req.params.tagName);
      const posts = await tagService.getPostsByTag(tagName);
      res.json(posts);
    } catch (error) {
      console.error('❌ 获取 Tag 文章列表失败:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.use('/api/ext', router);
  console.log('✅ Extensions 已注册: /api/ext/tags');
}

module.exports = { registerExtensions };
