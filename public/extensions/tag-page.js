/**
 * Tag 页面扩展模块
 * 提供 Tag 汇总页和 Tag 文章列表页的渲染功能
 * 包含路由匹配和视图控制器，实现最小侵入式设计
 */
(function() {
  'use strict';

  // ==================== 缓存管理 ====================
  
  const TagCache = {
    STORAGE_KEY: 'powerwiki_ext_tags',
    
    get() {
      try {
        const cached = localStorage.getItem(this.STORAGE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        console.warn('读取 Tag 缓存失败:', e);
      }
      return null;
    },
    
    set(data) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          data,
          cachedAt: Date.now()
        }));
      } catch (e) {
        console.warn('存储 Tag 缓存失败:', e);
      }
    },
    
    getLastUpdated() {
      const cached = this.get();
      return cached?.data?.lastUpdated || null;
    }
  };

  // ==================== 路由匹配器 ====================
  
  function matchTagRoute(path) {
    if (path === '/tag' || path === '/tag/') {
      return { type: 'cloud', tagName: null };
    }
    if (path.startsWith('/tag/')) {
      try {
        return { type: 'posts', tagName: decodeURIComponent(path.replace('/tag/', '')) };
      } catch (e) {
        console.error('Tag 路径解码失败:', e);
        return null;
      }
    }
    return null;
  }

  // ==================== 视图控制器 ====================
  
  const TagViewController = {
    show(tagName) {
      const tagView = document.getElementById('tagView');
      const homeView = document.getElementById('homeView');
      const postView = document.getElementById('postView');
      const tocSidebar = document.getElementById('tocSidebar');
      
      // 切换视图
      homeView?.classList.remove('active');
      postView?.classList.remove('active');
      tagView?.classList.add('active');
      
      // 隐藏右侧目录栏
      if (tocSidebar) {
        tocSidebar.style.display = 'none';
      }
      
      // 渲染内容
      const container = tagView?.querySelector('.tag-view-container');
      if (container) {
        if (tagName) {
          renderTagPosts(container, tagName);
          document.title = `标签：${tagName} - ${window.siteConfig?.siteTitle || 'PowerWiki'}`;
        } else {
          renderTagCloud(container);
          document.title = `所有标签 - ${window.siteConfig?.siteTitle || 'PowerWiki'}`;
        }
      }
    },
    
    hide() {
      const tagView = document.getElementById('tagView');
      tagView?.classList.remove('active');
    }
  };

  // ==================== API 请求 ====================

  async function fetchTagIndex() {
    const cached = TagCache.get();
    const since = TagCache.getLastUpdated();
    
    try {
      const url = since ? `/api/ext/tags?since=${encodeURIComponent(since)}` : '/api/ext/tags';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.changed === false) {
        return cached.data;
      }
      
      TagCache.set(data);
      return data;
    } catch (error) {
      console.error('获取 Tag 索引失败:', error);
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  }

  async function fetchTagPosts(tagName) {
    try {
      const response = await fetch(`/api/ext/tags/${encodeURIComponent(tagName)}`);
      return await response.json();
    } catch (error) {
      console.error('获取 Tag 文章列表失败:', error);
      throw error;
    }
  }

  // ==================== 渲染函数 ====================

  async function renderTagCloud(container) {
    container.innerHTML = `
      <div class="tag-view-loading">
        <div class="loading-dots"><span></span><span></span><span></span></div>
      </div>
    `;
    
    try {
      const data = await fetchTagIndex();
      const { tags, totalTags, totalPosts } = data;
      
      if (!tags || Object.keys(tags).length === 0) {
        container.innerHTML = `
          <div class="tag-view-empty">
            <p>暂无标签</p>
          </div>
        `;
        return;
      }
      
      const counts = Object.values(tags);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      const sizeRange = { min: 0.85, max: 1.6 };
      
      const getTagColors = window.TagFeature?.getTagColors || (() => ({ color: '#666', hoverBg: '#f0f0f0' }));
      const TAG_ICON_SVG = window.TagFeature?.TAG_ICON_SVG || '';
      
      const tagElements = Object.entries(tags).map(([tag, count]) => {
        let fontSize = sizeRange.min;
        if (maxCount > minCount) {
          fontSize = sizeRange.min + (count - minCount) / (maxCount - minCount) * (sizeRange.max - sizeRange.min);
        }
        
        const colors = getTagColors(tag);
        const encodedTag = encodeURIComponent(tag);
        
        return `
          <a href="/tag/${encodedTag}" 
             class="tag-cloud-item" 
             style="color: ${colors.color}; font-size: ${fontSize}rem;"
             onmouseenter="this.style.background='${colors.hoverBg}'"
             onmouseleave="this.style.background='transparent'">
            ${TAG_ICON_SVG}
            <span class="tag-name">${escapeHtml(tag)}</span>
            <span class="tag-count">${count}</span>
          </a>
        `;
      }).join('');
      
      container.innerHTML = `
        <div class="tag-view-header">
          <h2 class="tag-view-title">所有标签</h2>
          <p class="tag-view-stats">共 ${totalTags} 个标签，${totalPosts} 篇文章使用了标签</p>
        </div>
        <div class="tag-cloud">
          ${tagElements}
        </div>
      `;
    } catch (error) {
      container.innerHTML = `
        <div class="tag-view-error">
          <p>加载标签失败: ${escapeHtml(error.message)}</p>
          <button onclick="window.TagPage.renderTagCloud(this.parentElement.parentElement)">重试</button>
        </div>
      `;
    }
  }

  async function renderTagPosts(container, tagName) {
    container.innerHTML = `
      <div class="tag-view-loading">
        <div class="loading-dots"><span></span><span></span><span></span></div>
      </div>
    `;
    
    try {
      const data = await fetchTagPosts(tagName);
      const { tag, posts, count } = data;
      
      const getTagColors = window.TagFeature?.getTagColors || (() => ({ color: '#666' }));
      const TAG_ICON_SVG = window.TagFeature?.TAG_ICON_SVG || '';
      const colors = getTagColors(tag);
      
      if (!posts || posts.length === 0) {
        container.innerHTML = `
          <div class="tag-view-header">
            <a href="/tag" class="tag-back-btn">← 返回所有标签</a>
            <h2 class="tag-view-title" style="color: ${colors.color};">标签：${escapeHtml(tag)}</h2>
            <p class="tag-view-stats">暂无文章</p>
          </div>
        `;
        return;
      }
      
      const postElements = posts.map(post => {
        const encodedPath = encodeURIComponent(post.path);
        
        // 右上角胶囊标签（彩色、图标、不可交互，最多显示 3 个）
        let tagsHtml = '';
        if (post.tags && post.tags.length > 0) {
          const maxShow = 3;
          const visibleTags = post.tags.slice(0, maxShow);
          const remaining = post.tags.length - maxShow;
          
          let tagItems = visibleTags.map(t => {
            const tagColors = getTagColors(t);
            return `<span class="tag-label" style="color: ${tagColors.color};">${TAG_ICON_SVG}${escapeHtml(t)}</span>`;
          }).join('');
          
          if (remaining > 0) {
            tagItems += `<span class="tag-label tag-more">+${remaining}</span>`;
          }
          
          tagsHtml = `<div class="tag-post-tags">${tagItems}</div>`;
        }
        
        return `
          <a href="/post/${encodedPath}" class="tag-post-item">
            ${tagsHtml}
            <div class="tag-post-title">${escapeHtml(post.title)}</div>
            <div class="tag-post-path">${escapeHtml(post.path)}</div>
          </a>
        `;
      }).join('');
      
      container.innerHTML = `
        <div class="tag-view-header">
          <a href="/tag" class="tag-back-btn">← 返回所有标签</a>
          <h2 class="tag-view-title" style="color: ${colors.color};">标签：${escapeHtml(tag)}</h2>
          <p class="tag-view-stats">共 ${count} 篇文章</p>
        </div>
        <div class="tag-posts-list">
          ${postElements}
        </div>
      `;
    } catch (error) {
      container.innerHTML = `
        <div class="tag-view-error">
          <a href="/tag" class="tag-back-btn">← 返回所有标签</a>
          <p>加载文章列表失败: ${escapeHtml(error.message)}</p>
          <button onclick="window.TagPage.renderTagPosts(this.parentElement.parentElement, '${escapeHtml(tagName)}')">重试</button>
        </div>
      `;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== 导出 ====================

  // 导出渲染函数
  window.TagPage = {
    renderTagCloud,
    renderTagPosts,
    fetchTagIndex,
    fetchTagPosts
  };

  // 注册到全局扩展系统
  window.PowerWikiExtensions = window.PowerWikiExtensions || {};
  window.PowerWikiExtensions.tag = {
    matchRoute: matchTagRoute,
    showView: TagViewController.show,
    hideView: TagViewController.hide
  };
})();
