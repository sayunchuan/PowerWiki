/**
 * Tag Service
 *
 * Tag 服务模块
 * 负责扫描文件、提取 tags、构建索引
 *
 * @module extensions/tagService
 */

const { parseMarkdown } = require('../utils/markdownParser');

class TagService {
  /**
   * @param {Object} options
   * @param {Object} options.gitManager - Git 管理器
   * @param {Object} options.config - 网站配置
   * @param {Object} options.cacheManager - 缓存管理器
   */
  constructor({ gitManager, config, cacheManager }) {
    this.gitManager = gitManager;
    this.config = config;
    this.cache = cacheManager;
    
    // 缓存配置
    this.CACHE_TYPE = 'ext:tags';
    this.CACHE_TTL = 10 * 60 * 1000; // 10 分钟
    this.POSTS_CACHE_TTL = 5 * 60 * 1000; // 5 分钟
  }

  /**
   * 获取 Tag 索引
   * 返回所有 tag 及其文章数量
   * @returns {Promise<{tags: Object, lastUpdated: string}>}
   */
  async getTagIndex() {
    // 尝试从缓存获取
    const cached = this.cache.get(this.CACHE_TYPE, 'index');
    if (cached) {
      return cached;
    }

    // 构建索引
    const tagIndex = await this.buildTagIndex();
    
    // 存入缓存
    this.cache.set(this.CACHE_TYPE, 'index', tagIndex, this.CACHE_TTL);
    
    return tagIndex;
  }

  /**
   * 获取某 Tag 下的所有文章
   * @param {string} tagName - Tag 名称
   * @returns {Promise<{tag: string, posts: Array, count: number}>}
   */
  async getPostsByTag(tagName) {
    const cacheKey = `posts:${tagName}`;
    
    // 尝试从缓存获取
    const cached = this.cache.get(this.CACHE_TYPE, cacheKey);
    if (cached) {
      return cached;
    }

    // 获取完整的 Tag 数据
    const tagData = await this.buildTagData();
    const posts = tagData.tagPosts[tagName] || [];
    
    const result = {
      tag: tagName,
      posts: posts.sort((a, b) => new Date(b.modified) - new Date(a.modified)),
      count: posts.length
    };
    
    // 存入缓存
    this.cache.set(this.CACHE_TYPE, cacheKey, result, this.POSTS_CACHE_TTL);
    
    return result;
  }

  /**
   * 构建 Tag 索引（仅返回 tag 名称和数量）
   * @private
   */
  async buildTagIndex() {
    const tagData = await this.buildTagData();
    
    // 转换为 { tagName: count } 格式，并按数量排序
    const tags = {};
    const sortedTags = Object.entries(tagData.tagPosts)
      .sort((a, b) => b[1].length - a[1].length);
    
    for (const [tag, posts] of sortedTags) {
      tags[tag] = posts.length;
    }
    
    return {
      tags,
      totalTags: Object.keys(tags).length,
      totalPosts: tagData.totalPosts,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 构建完整的 Tag 数据（包括每个 tag 下的文章列表）
   * @private
   */
  async buildTagData() {
    // 检查完整数据缓存
    const cached = this.cache.get(this.CACHE_TYPE, 'fullData');
    if (cached) {
      return cached;
    }

    const files = await this.gitManager.getAllMarkdownFiles(this.config.mdPath);
    const tagPosts = {}; // { tagName: [post1, post2, ...] }
    let postsWithTags = 0;

    for (const file of files) {
      // 只处理 markdown 文件
      if (file.type !== 'markdown') continue;
      
      try {
        const content = await this.gitManager.readMarkdownFile(file.path);
        const parsed = parseMarkdown(content, file.path);
        
        if (parsed.tags && parsed.tags.length > 0) {
          postsWithTags++;
          const fileName = file.name.replace(/\.(md|markdown)$/i, '');
          
          // 清理所有 tags
          const cleanTags = parsed.tags
            .map(t => t.replace(/^["']|["']$/g, '').trim())
            .filter(t => t);
          
          const postInfo = {
            path: file.path,
            name: fileName,
            title: parsed.title || fileName,
            modified: file.modified,
            created: file.created,
            tags: cleanTags  // 包含该文章的所有标签
          };
          
          for (const cleanTag of cleanTags) {
            if (!tagPosts[cleanTag]) {
              tagPosts[cleanTag] = [];
            }
            tagPosts[cleanTag].push(postInfo);
          }
        }
      } catch (error) {
        // 跳过无法读取的文件
        console.warn(`⚠️ 无法读取文件 ${file.path} 的 tags:`, error.message);
      }
    }

    const result = {
      tagPosts,
      totalPosts: postsWithTags
    };

    // 缓存完整数据
    this.cache.set(this.CACHE_TYPE, 'fullData', result, this.CACHE_TTL);

    return result;
  }

  /**
   * 清除 Tag 相关缓存
   * 在 Git 同步后调用
   */
  clearCache() {
    this.cache.delete(this.CACHE_TYPE);
  }
}

module.exports = TagService;
