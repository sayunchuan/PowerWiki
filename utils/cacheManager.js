/**
 * Cache Manager
 * 
 * 缓存管理模块
 * 负责管理服务器端的内存缓存，包括文章列表、文章内容、配置等
 * 
 * @module cacheManager
 */

class CacheManager {
  constructor(options = {}) {
    // 默认缓存时间：5分钟
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000;
    
    // 缓存存储
    this.cache = new Map();
    
    // 缓存统计
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * 生成缓存键
   * @param {string} type - 缓存类型（posts, post, config, stats, pdf）
   * @param {string} key - 缓存键
   * @returns {string} 完整的缓存键
   */
  getCacheKey(type, key = '') {
    return `cache:${type}:${key}`;
  }

  /**
   * 获取缓存
   * @param {string} type - 缓存类型
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值，如果不存在或已过期则返回 null
   */
  get(type, key = '') {
    const cacheKey = this.getCacheKey(type, key);
    const item = this.cache.get(cacheKey);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * 设置缓存
   * @param {string} type - 缓存类型
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒），默认使用 defaultTTL
   */
  set(type, key = '', value, ttl = null) {
    const cacheKey = this.getCacheKey(type, key);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(cacheKey, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.stats.sets++;
  }

  /**
   * 删除缓存
   * @param {string} type - 缓存类型
   * @param {string} key - 缓存键（可选，如果不提供则删除该类型的所有缓存）
   */
  delete(type, key = null) {
    if (key === null) {
      // 删除该类型的所有缓存
      const keysToDelete = [];
      for (const [cacheKey] of this.cache) {
        if (cacheKey.startsWith(`cache:${type}:`)) {
          keysToDelete.push(cacheKey);
        }
      }
      keysToDelete.forEach(k => {
        this.cache.delete(k);
        this.stats.deletes++;
      });
    } else {
      const cacheKey = this.getCacheKey(type, key);
      if (this.cache.delete(cacheKey)) {
        this.stats.deletes++;
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
  }

  /**
   * 清除过期缓存
   */
  clearExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.stats.deletes++;
    });

    return keysToDelete.length;
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
      totalRequests: total
    };
  }

  /**
   * 检查缓存是否存在且未过期
   * @param {string} type - 缓存类型
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在且未过期
   */
  has(type, key = '') {
    const cacheKey = this.getCacheKey(type, key);
    const item = this.cache.get(cacheKey);

    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }
}

// 创建单例实例
const cacheManager = new CacheManager({
  defaultTTL: 5 * 60 * 1000 // 默认5分钟
});

// 定期清理过期缓存（每10分钟）
setInterval(() => {
  const cleared = cacheManager.clearExpired();
  if (cleared > 0) {
    console.log(`🧹 已清理 ${cleared} 个过期缓存项`);
  }
}, 10 * 60 * 1000);

module.exports = cacheManager;

