// 路径编码函数：保留 / 不编码，只编码路径中的其他特殊字符
function encodePath(path) {
  return path.split('/').map(part => encodeURIComponent(part)).join('/');
}

// 主题管理
const ThemeManager = {
  STORAGE_KEY: 'powerwiki_theme',
  MANUAL_KEY: 'powerwiki_theme_manual',
  MANUAL_DATE_KEY: 'powerwiki_theme_manual_date',
  
  init() {
    const manualDate = localStorage.getItem(this.MANUAL_DATE_KEY);
    const today = new Date().toDateString();
    const isManual = localStorage.getItem(this.MANUAL_KEY) === 'true' && manualDate === today;
    let theme;
    
    if (isManual) {
      theme = localStorage.getItem(this.STORAGE_KEY) || 'light';
    } else {
      theme = this.getAutoTheme();
      localStorage.setItem(this.STORAGE_KEY, theme);
      localStorage.removeItem(this.MANUAL_KEY);
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    setTimeout(() => this.updateToggleIcon(theme), 0);
  },
  
  getAutoTheme() {
    const hour = new Date().getHours();
    return (hour >= 22 || hour < 5) ? 'dark' : 'light';
  },
  
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateToggleIcon(theme);

    // 同步 Mermaid 主题并重新渲染已有图表
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose'
      });
      // 重新渲染当前页面上的 Mermaid 图表
      const mermaidEls = document.querySelectorAll('.mermaid[data-mermaid-source]');
      if (mermaidEls.length > 0) {
        mermaidEls.forEach(el => {
          el.removeAttribute('data-processed');
          el.innerHTML = el.getAttribute('data-mermaid-source');
        });
        try {
          mermaid.run({ nodes: mermaidEls });
        } catch (err) {
          console.error('Mermaid re-render error:', err);
        }
      }
    }
    if (window.TagFeature) window.TagFeature.refresh(); // 刷新 Tag 颜色
  },
  
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
    localStorage.setItem(this.MANUAL_KEY, 'true');
    localStorage.setItem(this.MANUAL_DATE_KEY, new Date().toDateString());
  },
  
  updateToggleIcon(theme) {
    const btn = document.querySelector('.theme-toggle-btn');
    if (!btn) return;
    
    btn.innerHTML = theme === 'dark' 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
};

// 初始化 Mermaid 图表渲染
if (typeof mermaid !== 'undefined') {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose'
  });
}

// 国际化 (i18n) 支持 - 复用服务器端翻译
const i18n = {
  locale: document.documentElement.lang || 'zh-CN',
  translations: {},

  init() {
    // 从 window.__I18N__ 获取翻译
    this.translations = window.__I18N__ || {};
  },

  t(key) {
    const keys = key.split('.');
    let result = this.translations;

    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key; // 返回 key 如果翻译不存在
      }
    }

    return result;
  },

  // 初始化页面元素的 i18n 属性
  initElements() {
    // 设置带 data-i18n 属性的元素文本
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    // 设置带 data-i18n-placeholder 属性的 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // 设置带 data-i18n-title 属性的 title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
  },

  // 格式化翻译（支持参数替换）
  tf(key, ...args) {
    let text = this.t(key);
    args.forEach((arg, index) => {
      text = text.replace(`{${index}}`, arg);
    });
    return text;
  }
};

// 全局状态
let postsTree = {};
let postsFlat = [];
let currentPost = null;
let isMobileMenuOpen = false;
let siteConfig = null; // 存储站点配置

// 客户端缓存管理
const ClientCache = {
  // 缓存版本号（当服务器更新时，可以改变版本号来清除所有缓存）
  CACHE_VERSION: '1.0.0',
  PREFIX: 'powerwiki_cache_',

  // 默认缓存时间（毫秒）
  DEFAULT_TTL: {
    posts: 10 * 60 * 1000,      // 文章列表：10分钟
    post: 10 * 60 * 1000,        // 单篇文章：10分钟
    config: 30 * 60 * 1000,      // 配置：30分钟
    stats: 1 * 60 * 1000         // 统计数据：1分钟
  },

  /**
   * 获取缓存键
   */
  getKey(type, id = '') {
    return `${this.PREFIX}${this.CACHE_VERSION}_${type}_${id}`;
  },

  /**
   * 获取缓存
   */
  get(type, id = '') {
    try {
      const key = this.getKey(type, id);
      const cached = localStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);

      // 检查是否过期
      if (Date.now() > data.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.warn(i18n.t('client.readCacheFailed'), error);
      return null;
    }
  },

  /**
   * 设置缓存
   */
  set(type, id = '', value, ttl = null) {
    try {
      const key = this.getKey(type, id);
      const expiresAt = Date.now() + (ttl || this.DEFAULT_TTL[type] || 5 * 60 * 1000);

      const data = {
        value,
        expiresAt,
        createdAt: Date.now()
      };

      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // 如果存储空间不足，清除旧缓存
      if (error.name === 'QuotaExceededError') {
        console.warn(i18n.t('client.storageFull'));
        this.clearExpired();
        // 重试一次
        try {
          const key = this.getKey(type, id);
          const expiresAt = Date.now() + (ttl || this.DEFAULT_TTL[type] || 5 * 60 * 1000);
          localStorage.setItem(key, JSON.stringify({ value, expiresAt, createdAt: Date.now() }));
        } catch (e) {
          console.error(i18n.t('client.cacheSetFailed'), e);
        }
      } else {
        console.error(i18n.t('client.cacheSetFailed'), error);
      }
    }
  },

  /**
   * 删除缓存
   */
  delete(type, id = null) {
    if (id === null) {
      // 删除该类型的所有缓存
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${this.PREFIX}${this.CACHE_VERSION}_${type}_`)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      const key = this.getKey(type, id);
      localStorage.removeItem(key);
    }
  },

  /**
   * 清除所有缓存
   */
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * 清除过期缓存
   */
  clearExpired() {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleared = 0;

    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data = JSON.parse(cached);
            if (now > data.expiresAt) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (e) {
          // 如果解析失败，删除该缓存
          localStorage.removeItem(key);
          cleared++;
        }
      }
    });

    return cleared;
  },

  /**
   * 检查缓存是否存在且未过期
   */
  has(type, id = '') {
    const cached = this.get(type, id);
    return cached !== null;
  }
};

// 定期清理过期缓存（每5分钟）
setInterval(() => {
  const cleared = ClientCache.clearExpired();
  if (cleared > 0) {
    console.log(`🧹 ${i18n.tf('client.clearedCacheItems', cleared)}`);
  }
}, 5 * 60 * 1000);

// DOM 元素
const postList = document.getElementById('postList');
const searchInput = document.getElementById('searchInput');
const siteLogo = document.getElementById('siteLogo');
const homeView = document.getElementById('homeView');
const postView = document.getElementById('postView');
const postBody = document.getElementById('postBody');
const postDate = document.getElementById('postDate');
const postFileName = document.getElementById('postFileName');
const postSize = document.getElementById('postSize');
const postTags = document.getElementById('postTags');
const siteHeader = document.getElementById('siteHeader');
const siteFooter = document.getElementById('siteFooter');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  ThemeManager.init(); // 初始化主题
  i18n.init(); // 初始化国际化（同步）
  i18n.initElements(); // 初始化页面元素的翻译
  loadConfig();
  await loadPosts(); // 等待文章列表加载完成
  setupEventListeners();
  setupRouting(); // 然后设置路由
  setupBackToTop(); // 设置返回顶部按钮
});

// 加载网站配置和模板
async function loadConfig() {
  try {
    // 检查缓存
    const cached = ClientCache.get('config');
    if (cached) {
      const config = cached;
      applyConfig(config);
      
      // 如果配置了首页路径但没有首页内容，说明仓库可能还在初始化，稍后重试
      if (config.pages && config.pages.home && !config.homeContent) {
        checkAndReloadConfig();
      }
      return;
    }

    const response = await fetch('/api/config');
    const config = await response.json();

    // 缓存配置
    ClientCache.set('config', '', config);

    applyConfig(config);
    
    // 如果配置了首页路径但没有首页内容，说明仓库可能还在初始化，稍后重试
    if (config.pages && config.pages.home && !config.homeContent) {
      checkAndReloadConfig();
    }
  } catch (error) {
    console.error(i18n.t('client.loadConfigFailed'), error);
  }
}

// 检查并重新加载配置（用于仓库初始化完成后刷新）
let configCheckInterval = null;
function checkAndReloadConfig() {
  // 如果已经有检查任务在运行，不重复启动
  if (configCheckInterval) {
    return;
  }
  
  let checkCount = 0;
  configCheckInterval = setInterval(async () => {
    checkCount++;
    
    // 最多检查20次（约10秒）
    if (checkCount > 20) {
      clearInterval(configCheckInterval);
      configCheckInterval = null;
      return;
    }
    
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      // 如果现在有首页内容了，说明仓库初始化完成，重新加载配置
      if (config.pages && config.pages.home && config.homeContent) {
        clearInterval(configCheckInterval);
        configCheckInterval = null;
        
        // 清除缓存并重新加载
        ClientCache.delete('config');
        ClientCache.set('config', '', config);
        applyConfig(config);
      }
    } catch (error) {
      // 忽略错误，继续检查
    }
  }, 500); // 每500ms检查一次
}

// 更新 SEO Meta 标签
function updateSEOMetaTags(data) {
  const baseUrl = window.location.origin;
  const {
    title = 'PowerWiki - 知识库',
    description = 'PowerWiki - 一个现代化的知识库系统',
    keywords = '知识库,文档,Markdown,Wiki',
    url = baseUrl,
    image = '',
    type = 'website'
  } = data;

  // 更新基础 meta 标签
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('metaDescription').setAttribute('content', description);
  document.getElementById('metaKeywords').setAttribute('content', keywords);
  document.getElementById('canonicalUrl').setAttribute('href', url);

  // 更新 Open Graph 标签
  document.getElementById('ogUrl').setAttribute('content', url);
  document.getElementById('ogTitle').setAttribute('content', title);
  document.getElementById('ogDescription').setAttribute('content', description);
  document.getElementById('ogImage').setAttribute('content', image || `${baseUrl}/og-image.png`);
  if (siteConfig) {
    document.getElementById('ogSiteName').setAttribute('content', siteConfig.siteTitle || 'PowerWiki');
  }

  // 更新 Twitter Card 标签
  document.getElementById('twitterUrl').setAttribute('content', url);
  document.getElementById('twitterTitle').setAttribute('content', title);
  document.getElementById('twitterDescription').setAttribute('content', description);
  document.getElementById('twitterImage').setAttribute('content', image || `${baseUrl}/og-image.png`);

  // 更新结构化数据
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : 'WebSite',
    'headline': title,
    'description': description,
    'url': url
  };

  if (type === 'article' && data.articleData) {
    structuredData['datePublished'] = data.articleData.datePublished || new Date().toISOString();
    structuredData['dateModified'] = data.articleData.dateModified || new Date().toISOString();
    structuredData['author'] = {
      '@type': 'Organization',
      'name': siteConfig?.siteTitle || 'PowerWiki'
    };
    if (data.articleData.image) {
      structuredData['image'] = data.articleData.image;
    }
  } else {
    structuredData['name'] = siteConfig?.siteTitle || 'PowerWiki';
    structuredData['description'] = siteConfig?.siteDescription || description;
  }

  document.getElementById('structuredData').textContent = JSON.stringify(structuredData);
}

// 应用配置
function applyConfig(config) {
  siteConfig = config; // 保存配置供 SEO 函数使用

  // 更新标题
  if (siteLogo) {
    siteLogo.textContent = config.siteTitle || 'PowerWiki';
  }

  // 加载 header 和 footer
  if (siteHeader && config.header) {
    siteHeader.innerHTML = config.header;
  }
  if (siteFooter && config.footer) {
    siteFooter.innerHTML = config.footer;
    // 更新统计数据
    updateFooterStats();
  }

  // 加载首页模板
  if (homeView && config.home) {
    homeView.innerHTML = config.home;

    // 如果配置了 README 文件，显示其内容
    if (config.homeContent && config.homeContent.html) {
      try {
        const homeContent = document.getElementById('homeContent');
        const homeWelcome = document.getElementById('homeWelcome');

        if (homeContent) {
          homeContent.innerHTML = config.homeContent.html;
          homeContent.style.display = 'block';

          // 隐藏默认欢迎页面
          if (homeWelcome) {
            homeWelcome.style.display = 'none';
          }

          // 为代码块和图片添加功能
          addCopyButtonsToCodeBlocks(homeContent);
          addImageZoomFeature(homeContent);
          renderMermaidBlocks(homeContent);

          // 为标题添加 ID 并生成目录（如果有标题）
          generateHomeTOC();
        }
      } catch (error) {
        console.error(i18n.t('client.loadHomeContentFailed'), error);
        // 如果出错，显示默认欢迎页面
        const homeWelcome = document.getElementById('homeWelcome');
        if (homeWelcome) {
          homeWelcome.style.display = 'block';
        }
      }
    }
  }

  // 更新页面标题和 SEO
  const homeTitle = `${config.siteTitle || 'PowerWiki'} - ${config.siteDescription || '知识库'}`;
  document.title = homeTitle;

  // 更新 SEO meta 标签（首页）
  updateSEOMetaTags({
    title: homeTitle,
    description: config.siteDescription || 'PowerWiki - 一个现代化的知识库系统',
    keywords: '知识库,文档,Markdown,Wiki',
    url: window.location.origin,
    type: 'website'
  });
}

// 设置事件监听
function setupEventListeners() {
  // 主题切换按钮
  const themeToggleBtn = document.querySelector('.theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      ThemeManager.toggle();
    });
  }

  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    filterPosts(e.target.value);
  });

  // 标题点击回到首页
  if (siteLogo) {
    siteLogo.style.cursor = 'pointer';
    siteLogo.addEventListener('click', () => {
      goToHome();
    });
  }

  // Header 中的标题点击回到首页
  document.addEventListener('click', (e) => {
    const headerTitle = e.target.closest('.site-title');
    if (headerTitle) {
      e.preventDefault();
      goToHome();
    }
  });

  // 目录收缩/展开按钮
  const tocToggleBtn = document.getElementById('tocToggleBtn');
  const tocExpandBtn = document.getElementById('tocExpandBtn');
  const tocSidebar = document.getElementById('tocSidebar');

  if (tocToggleBtn && tocSidebar && tocExpandBtn) {
    // 收起目录
    tocToggleBtn.addEventListener('click', () => {
      tocSidebar.classList.add('collapsed');
      tocExpandBtn.classList.add('show');
      // 保存状态到 localStorage
      localStorage.setItem('tocCollapsed', 'true');
    });

    // 展开目录
    tocExpandBtn.addEventListener('click', () => {
      tocSidebar.classList.remove('collapsed');
      tocExpandBtn.classList.remove('show');
      // 保存状态到 localStorage
      localStorage.setItem('tocCollapsed', 'false');
    });

    // 恢复上次的状态
    const tocCollapsed = localStorage.getItem('tocCollapsed');
    if (tocCollapsed === 'true') {
      tocSidebar.classList.add('collapsed');
      tocExpandBtn.classList.add('show');
    }
  }

  // 移动端菜单按钮
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isMobileMenuOpen = !isMobileMenuOpen;
      if (isMobileMenuOpen) {
        sidebar.classList.add('open');
        if (sidebarOverlay) {
          sidebarOverlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden'; // 防止背景滚动
        // 添加触摸事件防止滚动穿透
        document.addEventListener('touchmove', preventScroll, { passive: false });
      } else {
        closeMobileMenu();
      }
    });
  }

  // 点击遮罩关闭侧边栏
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      closeMobileMenu();
    });
  }

  // 点击文档后关闭移动端侧边栏
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item-file')) {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    }
  });

  // 窗口大小改变时处理
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && isMobileMenuOpen) {
      closeMobileMenu();
    }
  });

  // 一键收起/展开所有目录
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  if (collapseAllBtn) {
    let isCollapsed = false;
    collapseAllBtn.addEventListener('click', () => {
      const allDirs = postList.querySelectorAll('.nav-dir');
      if (isCollapsed) {
        // 展开所有目录
        allDirs.forEach(dirElement => {
          dirElement.classList.add('expanded');
          const children = dirElement.querySelector('.nav-dir-children');
          if (children) {
            children.style.display = 'block';
          }
        });
        collapseAllBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${i18n.t('client.collapseAll')}</span>
        `;
        collapseAllBtn.title = i18n.t('client.collapseDirs');
        isCollapsed = false;
      } else {
        // 收起所有目录
        allDirs.forEach(dirElement => {
          dirElement.classList.remove('expanded');
          const children = dirElement.querySelector('.nav-dir-children');
          if (children) {
            children.style.display = 'none';
          }
        });
        collapseAllBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 8.75L7 5.25L3.5 8.75" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${i18n.t('client.expandAll')}</span>
        `;
        collapseAllBtn.title = i18n.t('client.expandDirs');
        isCollapsed = true;
      }
    });
  }
}

// 防止滚动穿透
function preventScroll(e) {
  e.preventDefault();
}

// 关闭移动端菜单
function closeMobileMenu() {
  isMobileMenuOpen = false;
  if (sidebar) {
    sidebar.classList.remove('open');
  }
  if (sidebarOverlay) {
    sidebarOverlay.classList.remove('active');
  }
  document.body.style.overflow = '';
  document.removeEventListener('touchmove', preventScroll);
}

// 回到首页
function goToHome() {
  try {
    homeView.classList.add('active');
    postView.classList.remove('active');
    // 隐藏所有扩展视图
    if (window.PowerWikiExtensions) {
      Object.values(window.PowerWikiExtensions).forEach(ext => ext.hideView && ext.hideView());
    }
    currentPost = null;
    window.history.pushState({}, '', '/');

    // 更新 SEO meta 标签（首页）
    if (siteConfig) {
      const homeTitle = `${siteConfig.siteTitle || 'PowerWiki'} - ${siteConfig.siteDescription || '知识库'}`;
      document.title = homeTitle;
      updateSEOMetaTags({
        title: homeTitle,
        description: siteConfig.siteDescription || 'PowerWiki - 一个现代化的知识库系统',
        keywords: '知识库,文档,Markdown,Wiki',
        url: window.location.origin,
        type: 'website'
      });
    }

    // 检查首页是否有 README 内容，有则显示目录
    const homeContent = document.getElementById('homeContent');
    if (homeContent && homeContent.innerHTML.trim() !== '') {
      generateHomeTOC();
    } else {
      // 没有内容则隐藏目录栏
      const tocSidebar = document.getElementById('tocSidebar');
      if (tocSidebar) {
        tocSidebar.style.display = 'none';
      }
    }

    // 清除导航栏选中状态
    if (postList) {
      postList.querySelectorAll('.nav-item-file').forEach(item => {
        item.classList.remove('active');
      });
      postList.querySelectorAll('.nav-dir').forEach(item => {
        item.classList.remove('active');
      });
    }

    // 滚动到顶部
    window.scrollTo(0, 0);
  } catch (error) {
    console.error(i18n.t('client.goHomeFailed'), error);
  }
}

// 设置路由
function setupRouting() {
  const path = window.location.pathname;
  
  // === 扩展路由钩子 ===
  if (window.PowerWikiExtensions) {
    for (const ext of Object.values(window.PowerWikiExtensions)) {
      const match = ext.matchRoute && ext.matchRoute(path);
      if (match) {
        ext.showView && ext.showView(match.tagName);
        return;
      }
    }
  }
  // === 扩展路由钩子结束 ===
  
  // 文章详情页路由
  if (path.startsWith('/post/')) {
    const encodedPath = path.replace('/post/', '');
    // 解码 URL 编码的路径
    try {
      const postPath = decodeURIComponent(encodedPath);
      // 等待文章列表加载完成后再加载文章
      if (postsFlat.length > 0) {
        loadPost(postPath);
      } else {
        // 如果文章列表还没加载，等待加载完成
        const checkInterval = setInterval(() => {
          if (postsFlat.length > 0) {
            clearInterval(checkInterval);
            loadPost(postPath);
          }
        }, 100);
        // 5秒后超时
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    } catch (error) {
      console.error(i18n.t('client.pathDecodeFailed'), error);
      showNotification(i18n.t('client.pathParseFailed'), 'error');
    }
  }
}

// 加载文章列表
async function loadPosts() {
  try {
    // 检查缓存
    const cached = ClientCache.get('posts');
    if (cached) {
      postsTree = cached.tree || {};
      postsFlat = cached.flat || [];
      renderPostsTree(postsTree);
      // 后台更新数据
      updatePostsInBackground();
      return;
    }

    postList.innerHTML = `<li class="nav-item loading">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <span style="margin-left: 8px;">${i18n.t('client.loading')}</span>
    </li>`;
    const response = await fetch('/api/posts');
    const data = await response.json();
    postsTree = data.tree || {};
    postsFlat = data.flat || [];

    // 缓存数据
    ClientCache.set('posts', '', data);

    renderPostsTree(postsTree);
  } catch (error) {
    postList.innerHTML = `<li class="nav-item loading">${i18n.t('client.loadPostsFailed')}</li>`;
    console.error(i18n.t('client.loadPostsFailed'), error);
  }
}

// 后台更新文章列表（不阻塞UI）
async function updatePostsInBackground() {
  try {
    const response = await fetch('/api/posts');
    const data = await response.json();

    // 检查数据是否有变化
    const cached = ClientCache.get('posts');
    if (cached && JSON.stringify(cached) !== JSON.stringify(data)) {
      // 数据有更新，更新缓存和UI
      postsTree = data.tree || {};
      postsFlat = data.flat || [];
      ClientCache.set('posts', '', data);

      // 如果当前没有选中文章，更新UI
      if (!currentPost) {
        renderPostsTree(postsTree);
      }
    } else {
      // 数据没有变化，只更新缓存时间
      ClientCache.set('posts', '', data);
    }
  } catch (error) {
    console.warn(i18n.t('client.backgroundUpdatePostsFailed'), error);
  }
}

// 切换目录展开/折叠状态
function toggleDirExpand(dirItem) {
  const children = dirItem.querySelector('.nav-dir-children');
  if (children) {
    const isExpanded = dirItem.classList.contains('expanded');
    if (isExpanded) {
      dirItem.classList.remove('expanded');
      children.style.display = 'none';
    } else {
      dirItem.classList.add('expanded');
      children.style.display = 'block';
    }
  }
}

// 渲染目录树
function renderPostsTree(tree) {
  if (!tree || (Object.keys(tree.dirs || {}).length === 0 && (tree.files || []).length === 0)) {
    postList.innerHTML = `<li class="nav-item loading" style="color: var(--text-placeholder);">${i18n.t('client.noArticles')}</li>`;
    return;
  }

  postList.innerHTML = renderTreeNodes(tree, '', true); // 传入 true 表示这是根级别

  // 添加点击事件
  postList.querySelectorAll('.nav-item-file').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = item.dataset.path;
      if (path) {
        loadPost(path);
        // 更新 URL
        window.history.pushState({ path }, '', `/post/${encodePath(path)}`);
        // 更新活动状态（清除所有文件和文件夹的选中状态）
        postList.querySelectorAll('.nav-item-file').forEach(i => i.classList.remove('active'));
        postList.querySelectorAll('.nav-dir').forEach(d => d.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });

  // 添加目录折叠/展开事件（点击箭头图标）
  postList.querySelectorAll('.nav-dir-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const dirItem = toggle.closest('.nav-dir');
      toggleDirExpand(dirItem);
    });
  });

  // 添加目录名称点击事件（点击目录名称：有 README 则加载，同时展开/折叠）
  postList.querySelectorAll('.nav-dir-name').forEach(dirName => {
    dirName.addEventListener('click', (e) => {
      e.stopPropagation();
      const dirItem = dirName.closest('.nav-dir');
      const readmePath = dirName.dataset.readmePath;

      // 如果有 README，且不是当前已加载的文章，才加载
      if (readmePath && (!currentPost || currentPost.path !== readmePath)) {
        loadPost(readmePath);
        window.history.pushState({ path: readmePath }, '', `/post/${encodePath(readmePath)}`);

        // 高亮当前目录
        postList.querySelectorAll('.nav-item-file').forEach(i => i.classList.remove('active'));
        postList.querySelectorAll('.nav-dir').forEach(d => d.classList.remove('active'));
        dirItem.classList.add('active');
      }

      // 同时展开/折叠目录
      toggleDirExpand(dirItem);
    });
  });

  // 目录头部整体点击事件（用于没有 README 的目录）
  postList.querySelectorAll('.nav-dir-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // 如果点击的是 toggle 或 name，让它们各自的事件处理
      if (e.target.closest('.nav-dir-toggle') || e.target.closest('.nav-dir-name')) {
        return;
      }
      e.stopPropagation();
      const dirItem = header.closest('.nav-dir');
      toggleDirExpand(dirItem);
    });
  });

  // 默认展开所有目录
  const allDirs = postList.querySelectorAll('.nav-dir');
  allDirs.forEach(dirElement => {
    dirElement.classList.add('expanded');
    const children = dirElement.querySelector('.nav-dir-children');
    if (children) {
      children.style.display = 'block';
    }
  });

  // 如果当前有文章，高亮对应项
  if (currentPost) {
    const currentItem = postList.querySelector(`[data-path="${currentPost.path}"]`);
    if (currentItem) {
      currentItem.classList.add('active');
      // 确保所有父目录都是展开的
      let parent = currentItem.parentElement;
      while (parent && parent !== postList) {
        if (parent.classList.contains('nav-dir')) {
          parent.classList.add('expanded');
          const children = parent.querySelector('.nav-dir-children');
          if (children) {
            children.style.display = 'block';
          }
        }
        parent = parent.parentElement;
      }
    }
  }
}

// 递归渲染树节点
function renderTreeNodes(node, prefix = '') {
  let html = '';

  // 渲染目录（保持服务器端已排序的顺序，不进行字母排序）
  if (node.dirs) {
    const dirNames = Object.keys(node.dirs);
    dirNames.forEach(dirName => {
      const dirNode = node.dirs[dirName];
      const dirPath = prefix ? `${prefix}/${dirName}` : dirName;
      const hasReadme = dirNode.readme ? 'true' : 'false';
      const readmePath = dirNode.readme ? dirNode.readme.path : '';

      html += `
        <li class="nav-dir" data-has-readme="${hasReadme}" data-readme-path="${readmePath}">
          <div class="nav-dir-header">
            <span class="nav-dir-toggle">▶</span>
            <span class="nav-dir-name${dirNode.readme ? ' has-readme' : ''}" ${dirNode.readme ? `data-readme-path="${readmePath}"` : ''}>${escapeHtml(dirName)}</span>
          </div>
          <ul class="nav-dir-children" style="display: none;">
            ${renderTreeNodes(dirNode, dirPath)}
          </ul>
        </li>
      `;
    });
  }

  // 渲染文件
  if (node.files) {
    node.files.forEach(file => {
      const fileType = file.type || (file.path.endsWith('.pdf') ? 'pdf' : 'markdown');
      const fileIcon = fileType === 'pdf'
        ? `<svg class="nav-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M10 12h4M10 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
        : `<svg class="nav-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 8h10M7 12h7M7 16h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
      html += `
        <li class="nav-item-file" data-path="${file.path}" data-type="${fileType}">
          ${fileIcon}
          <span class="nav-item-title">${escapeHtml(file.name)}</span>
        </li>
      `;
    });
  }

  return html;
}

// 过滤文章
function filterPosts(keyword) {
  if (!keyword.trim()) {
    renderPostsTree(postsTree);
    return;
  }

  // 搜索时使用扁平列表
  const filtered = postsFlat.filter(post => {
    const fileName = post.name.replace(/\.(md|markdown|pdf)$/i, '');
    const searchText = `${fileName} ${post.name} ${post.path}`.toLowerCase();
    return searchText.includes(keyword.toLowerCase());
  });

  // 构建过滤后的树结构
  const filteredTree = buildDirectoryTree(filtered);
  renderPostsTree(filteredTree);
}

// 构建目录树（用于搜索过滤）
function buildDirectoryTree(files) {
  const tree = {};

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        const fileName = part.replace(/\.(md|markdown|pdf)$/i, '');
        if (!current.files) {
          current.files = [];
        }
        current.files.push({
          name: fileName,
          path: file.path,
          fullName: file.name,
          modified: file.modified,
          size: file.size,
          type: file.type || (file.path.endsWith('.pdf') ? 'pdf' : 'markdown')
        });
      } else {
        if (!current.dirs) {
          current.dirs = {};
        }
        if (!current.dirs[part]) {
          current.dirs[part] = {};
        }
        current = current.dirs[part];
      }
    }
  });

  return tree;
}

// 加载单篇文章
async function loadPost(filePath) {
  try {
    postView.classList.remove('active');
    homeView.classList.remove('active');

    // 检查缓存
    const cached = ClientCache.get('post', filePath);
    if (cached) {
      currentPost = cached;
      renderPost(cached);
      // 后台更新文章（访问量可能变化）
      updatePostInBackground(filePath);
      return;
    }

    const response = await fetch(`/api/post/${encodePath(filePath)}`);
    if (!response.ok) {
      throw new Error('文章不存在');
    }

    const post = await response.json();
    currentPost = post;

    // 缓存文章
    ClientCache.set('post', filePath, post);

    renderPost(post);
  } catch (error) {
    console.error(i18n.t('client.loadPostFailed'), error);
    showNotification(i18n.t('client.loadPostFailed') + ': ' + error.message, 'error');
    // 文章不存在时自动跳转到首页
    if (error.message === 'Article not found' || error.message === '文章不存在') {
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }
}

// 渲染文章
function renderPost(post) {

  // 显示文件名（从路径中提取）
  const fileName = post.path.split('/').pop().replace(/\.(md|markdown|pdf)$/i, '');
  if (postFileName) {
    postFileName.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 2v3h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>${escapeHtml(fileName)}</span>
    `;
  }

  // 显示查看量
  const viewCount = post.viewCount || 0;
  const postViewCount = document.getElementById('postViewCount');
  if (postViewCount) {
    // 追加文字到现有的 SVG 图标后
    const existingText = postViewCount.querySelector('span.view-text');
    if (existingText) {
      existingText.textContent = viewCount;
    } else {
      const textSpan = document.createElement('span');
      textSpan.className = 'view-text';
      textSpan.textContent = viewCount;
      postViewCount.appendChild(textSpan);
    }
  }

  // 检查文件类型
  const filePath = post.path;
  const fileType = post.type || (filePath.endsWith('.pdf') ? 'pdf' : 'markdown');

  if (fileType === 'pdf') {
    // PDF 文件：渲染成图片，无任何控件
    const pdfUrl = `/api/pdf/${encodePath(filePath)}`;
    postBody.innerHTML = `<div class="pdf-pages" id="pdfPages"></div>`;

    // 加载并渲染 PDF
    renderPdfAsImages(pdfUrl);

    // PDF 文件不显示目录
    const tocSidebar = document.getElementById('tocSidebar');
    if (tocSidebar) {
      tocSidebar.style.display = 'none';
    }
  } else {
    // Markdown 文件：正常渲染
    postBody.innerHTML = post.html;

    // 为代码块添加复制按钮
    addCopyButtonsToCodeBlocks();

    // 为图片添加点击放大功能
    addImageZoomFeature();

    // 渲染 Mermaid 图表
    renderMermaidBlocks();

    // 为标题添加 ID 并生成目录
    generateTOC();

    // 显示目录栏
    const tocSidebar = document.getElementById('tocSidebar');
    if (tocSidebar) {
      tocSidebar.style.display = 'flex';
    }

    // 设置目录滚动监听
    setupTOCScroll();
  }

  // 格式化创建日期（显示在左上角）
  const createdDate = new Date(post.fileInfo.created || post.fileInfo.modified);
  const createdDateText = createdDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  // 追加文字到现有的 SVG 图标后
  const existingDateText = postDate.querySelector('span.date-text');
  if (existingDateText) {
    existingDateText.textContent = createdDateText;
  } else {
    const dateSpan = document.createElement('span');
    dateSpan.className = 'date-text';
    dateSpan.textContent = createdDateText;
    postDate.appendChild(dateSpan);
  }

  // 渲染 tags（使用扩展模块）
  if (window.TagFeature) {
    window.TagFeature.render(post.tags, escapeHtml);
  }

  // 添加更新时间到文章末尾（右下角）
  // 先移除可能存在的旧更新时间元素
  const existingUpdatedTime = postBody.querySelector('.post-updated-time');
  if (existingUpdatedTime) {
    existingUpdatedTime.remove();
  }

  // 只有在创建时间和修改时间不同时才显示更新时间
  const modifiedDate = new Date(post.fileInfo.modified);
  const createdDateForCompare = new Date(post.fileInfo.created || post.fileInfo.modified);
  if (post.fileInfo.created && createdDateForCompare.getTime() !== modifiedDate.getTime()) {
    const updatedDateText = modifiedDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const updatedTimeDiv = document.createElement('div');
    updatedTimeDiv.className = 'post-updated-time';
    updatedTimeDiv.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/>
        <path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <span>${i18n.tf('client.updatedTime', updatedDateText)}</span>
    `;
    postBody.appendChild(updatedTimeDiv);
  }

  // 添加许可证和原创声明到文章末尾
  // 先移除可能存在的旧许可证元素
  const existingLicense = postBody.querySelector('.post-license');
  if (existingLicense) {
    existingLicense.remove();
  }

  const licenseDiv = document.createElement('div');
  licenseDiv.className = 'post-license';
  licenseDiv.innerHTML = `
    <div class="license-content">
      <div class="license-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L3 3.5v5c0 3.5 2.5 6.5 5 7.5 2.5-1 5-4 5-7.5v-5L8 1z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 7h4M6 9h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="license-text">
        <p class="license-title">${i18n.t('client.copyright')}</p>
        <p class="license-description">${i18n.t('client.copyrightText')} <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">${i18n.t('client.license')}</a></p>
      </div>
    </div>
  `;
  postBody.appendChild(licenseDiv);

  // 格式化文件大小
  const sizeKB = (post.fileInfo.size / 1024).toFixed(2);
  const sizeMB = (post.fileInfo.size / (1024 * 1024)).toFixed(2);
  const sizeText = post.fileInfo.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
  const existingSizeText = postSize.querySelector('span.size-text');
  if (existingSizeText) {
    existingSizeText.textContent = sizeText;
  } else {
    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'size-text';
    sizeSpan.textContent = sizeText;
    postSize.appendChild(sizeSpan);
  }

  // 显示文章视图
  postView.classList.add('active');
  homeView.classList.remove('active');
  // 隐藏所有扩展视图
  if (window.PowerWikiExtensions) {
    Object.values(window.PowerWikiExtensions).forEach(ext => ext.hideView && ext.hideView());
  }

  // 更新 SEO meta 标签（文章页）
  const articleUrl = `${window.location.origin}/post/${encodePath(post.path)}`;
  const articleTitle = `${post.title} - ${siteConfig?.siteTitle || 'PowerWiki'}`;
  const articleDescription = post.description || post.title || 'PowerWiki 文章';

  // 提取文章中的第一张图片作为 og:image
  let articleImage = '';
  if (post.html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.html;
    const firstImg = tempDiv.querySelector('img');
    if (firstImg && firstImg.src) {
      articleImage = firstImg.src.startsWith('http') ? firstImg.src : `${window.location.origin}${firstImg.src}`;
    }
  }

  document.title = articleTitle;
  updateSEOMetaTags({
    title: articleTitle,
    description: articleDescription,
    keywords: `${post.title},知识库,文档`,
    url: articleUrl,
    image: articleImage,
    type: 'article',
    articleData: {
      datePublished: post.fileInfo?.modified || new Date().toISOString(),
      dateModified: post.fileInfo?.modified || new Date().toISOString(),
      image: articleImage
    }
  });

  // 更新footer统计信息
  updateFooterStats();

  // 滚动到顶部
  window.scrollTo(0, 0);

  // 更新导航栏活动状态（清除所有选中状态）
  postList.querySelectorAll('.nav-item-file').forEach(i => i.classList.remove('active'));
  postList.querySelectorAll('.nav-dir').forEach(d => d.classList.remove('active'));

  // 高亮当前文件
  const currentFilePath = post.path;
  postList.querySelectorAll('.nav-item-file').forEach(item => {
    if (item.dataset.path === currentFilePath) {
      item.classList.add('active');
      // 展开所有父目录
      let parent = item.parentElement;
      while (parent && parent !== postList) {
        if (parent.classList.contains('nav-dir')) {
          parent.classList.add('expanded');
          const children = parent.querySelector('.nav-dir-children');
          if (children) {
            children.style.display = 'block';
          }
        }
        parent = parent.parentElement;
      }
    }
  });
}

// 后台更新文章（用于更新访问量等可能变化的数据）
async function updatePostInBackground(filePath) {
  try {
    const response = await fetch(`/api/post/${encodePath(filePath)}`);
    if (response.ok) {
      const post = await response.json();

      // 只更新访问量，不重新渲染整个页面
      if (post.viewCount !== undefined && currentPost && currentPost.path === filePath) {
        currentPost.viewCount = post.viewCount;
        const postViewCount = document.getElementById('postViewCount');
        if (postViewCount) {
          const existingText = postViewCount.querySelector('span.view-text');
          if (existingText) {
            existingText.textContent = post.viewCount;
          }
        }
      }

      // 更新缓存
      ClientCache.set('post', filePath, post);
    }
  } catch (error) {
    console.warn(i18n.t('client.backgroundUpdatePostFailed'), error);
  }
}

// 转义 HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 显示通知
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 添加 CSS 动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// 生成首页目录（如果首页有 README 内容）
function generateHomeTOC() {
  const homeContent = document.getElementById('homeContent');
  const tocNav = document.getElementById('tocNav');
  const tocSidebar = document.getElementById('tocSidebar');

  if (!homeContent || !tocNav || !tocSidebar) return;

  const headings = homeContent.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (headings.length === 0) {
    tocSidebar.style.display = 'none';
    return;
  }

  // 显示目录栏
  tocSidebar.style.display = 'flex';

  let tocHTML = '<ul>';
  let tocItems = [];

  // 为标题添加 ID 并收集目录项
  headings.forEach((heading, index) => {
    const id = `home-heading-${index}`;
    const text = heading.textContent.trim();
    const level = parseInt(heading.tagName.substring(1));

    heading.id = id;
    tocItems.push({ id, text, level });
  });

  // 渲染目录
  tocItems.forEach(item => {
    const className = `toc-h${item.level}`;
    tocHTML += `<li class="${className}"><a href="#${item.id}" data-id="${item.id}">${escapeHtml(item.text)}</a></li>`;
  });

  tocHTML += '</ul>';
  tocNav.innerHTML = tocHTML;

  // 添加目录点击事件
  tocNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 20;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        window.history.pushState({}, '', `#${targetId}`);
        updateTOCActive(targetId);
      }
    });
  });

  // 设置滚动监听
  setupHomeTOCScroll();
}

// 设置首页目录滚动高亮
function setupHomeTOCScroll() {
  const homeContent = document.getElementById('homeContent');
  if (!homeContent) return;

  const headings = homeContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) return;

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        let currentHeading = null;

        headings.forEach(heading => {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= 100) {
            currentHeading = heading;
          }
        });

        if (currentHeading) {
          updateTOCActive(currentHeading.id);
        }

        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
}

// 生成文章目录
function generateTOC() {
  const tocNav = document.getElementById('tocNav');
  const tocSidebar = document.getElementById('tocSidebar');
  const headings = postBody.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (headings.length === 0) {
    tocSidebar.style.display = 'none';
    return;
  }

  tocSidebar.style.display = 'flex';

  let tocHTML = '<ul>';
  let tocItems = [];

  headings.forEach((heading, index) => {
    const id = `heading-${index}`;
    const text = heading.textContent.trim();
    const level = parseInt(heading.tagName.substring(1));

    // 为标题添加 ID
    heading.id = id;

    // 创建目录项
    tocItems.push({ id, text, level });
  });

  // 渲染目录
  tocItems.forEach(item => {
    const className = `toc-h${item.level}`;
    tocHTML += `<li class="${className}"><a href="#${item.id}" data-id="${item.id}">${escapeHtml(item.text)}</a></li>`;
  });

  tocHTML += '</ul>';
  tocNav.innerHTML = tocHTML;

  // 添加目录点击事件
  tocNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        // 计算目标位置（考虑固定头部等偏移）
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 20;

        // 平滑滚动
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // 更新 URL（不触发页面跳转）
        window.history.pushState({}, '', `#${targetId}`);

        // 立即更新高亮状态
        updateTOCActive(targetId);
      }
    });
  });
}

// 更新目录高亮状态
function updateTOCActive(activeId) {
  const tocLinks = document.querySelectorAll('.toc-nav a');
  tocLinks.forEach(link => {
    const linkId = link.getAttribute('data-id');
    if (linkId === activeId) {
      link.classList.add('active');
      // 滚动目录到可见区域
      link.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      link.classList.remove('active');
    }
  });
}

// 设置目录滚动高亮
function setupTOCScroll() {
  const tocLinks = document.querySelectorAll('.toc-nav a');
  const headings = postBody.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (tocLinks.length === 0) return;

  function updateActiveTOC() {
    let currentActive = null;
    const offset = 100; // 偏移量

    // 从下往上查找当前应该高亮的标题
    for (let i = headings.length - 1; i >= 0; i--) {
      const heading = headings[i];
      const rect = heading.getBoundingClientRect();

      if (rect.top <= offset + 50) {
        currentActive = heading.id;
        break;
      }
    }

    // 如果没有找到，高亮第一个
    if (!currentActive && headings.length > 0) {
      currentActive = headings[0].id;
    }

    // 更新高亮状态
    if (currentActive) {
      updateTOCActive(currentActive);
    }
  }

  // 监听滚动事件
  let ticking = false;
  const scrollHandler = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateActiveTOC();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', scrollHandler, { passive: true });

  // 初始更新
  setTimeout(updateActiveTOC, 100);
}

// 更新footer统计信息
async function updateFooterStats(forceRefresh = false) {
  try {
    // 如果强制刷新，跳过缓存
    if (!forceRefresh) {
      const cached = ClientCache.get('stats');
      if (cached) {
        updateStatsUI(cached);
        // 后台更新统计数据
        updateStatsInBackground();
        return;
      }
    }

    // 添加时间戳防止浏览器缓存
    const response = await fetch('/api/stats?t=' + Date.now(), {
      cache: 'no-store'
    });
    const stats = await response.json();

    // 缓存统计数据（缩短缓存时间到30秒）
    ClientCache.set('stats', '', stats, 30 * 1000);

    updateStatsUI(stats);
  } catch (error) {
    console.error(i18n.t('client.updateStatsFailed'), error);
  }
}

// 更新统计信息UI
function updateStatsUI(stats) {
  const totalViewsEl = document.getElementById('totalViews');
  const totalPostsEl = document.getElementById('totalPosts');

  if (totalViewsEl) {
    totalViewsEl.textContent = stats.totalViews || 0;
  }
  if (totalPostsEl) {
    totalPostsEl.textContent = stats.postViews ? Object.keys(stats.postViews).length : 0;
  }
}

// 后台更新统计数据
async function updateStatsInBackground() {
  try {
    // 添加时间戳防止浏览器缓存
    const response = await fetch('/api/stats?t=' + Date.now(), {
      cache: 'no-store'
    });
    const stats = await response.json();
    ClientCache.set('stats', '', stats, 30 * 1000);
    updateStatsUI(stats);
  } catch (error) {
    console.warn(i18n.t('client.backgroundUpdateStatsFailed'), error);
  }
}

// 渲染 PDF 为图片（无任何控件，200dpi 高清）
async function renderPdfAsImages(pdfUrl) {
  const pagesContainer = document.getElementById('pdfPages');
  if (!pagesContainer) return;

  pagesContainer.innerHTML = `<div class="pdf-loading">${i18n.t('client.pdfLoading')}</div>`;

  try {
    // 动态导入 PDF.js
    const pdfjsLib = await import('/pdfjs/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.min.mjs';

    // 加载 PDF
    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    pagesContainer.innerHTML = '';

    // 计算缩放比例（适应容器宽度）
    const containerWidth = pagesContainer.clientWidth || 800;
    // 300dpi / 72dpi ≈ 4.17，使用 4x 渲染以获得高清效果
    const dpiScale = 4;

    // 渲染每一页
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });

      // 计算显示宽度
      const displayWidth = Math.min(containerWidth - 20, viewport.width * 2);
      const displayScale = displayWidth / viewport.width;

      // 高分辨率渲染
      const renderScale = displayScale * dpiScale;
      const renderViewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-img';
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.dataset.page = pageNum;
      // 设置 CSS 显示尺寸（缩小到实际显示大小）
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = (displayWidth / viewport.width * viewport.height) + 'px';

      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport: renderViewport }).promise;

      // 点击放大查看
      canvas.addEventListener('click', () => {
        openImageViewer(canvas.toDataURL('image/png'), pageNum, pdfDoc.numPages);
      });

      pagesContainer.appendChild(canvas);
    }
  } catch (error) {
    console.error(i18n.t('client.pdfLoadFailed'), error);
    pagesContainer.innerHTML = `<div class="pdf-error">${i18n.t('client.pdfLoadFailed')}</div>`;
  }
}

// 图片查看器
function openImageViewer(imageSrc, currentPage, totalPages) {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'image-viewer-overlay';
  overlay.innerHTML = `
    <div class="image-viewer-header">
      <span class="image-viewer-info">${i18n.tf('client.pageOf', currentPage, totalPages)}</span>
      <button class="image-viewer-close" title="关闭">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="image-viewer-content">
      <img src="${imageSrc}" alt="PDF 页面 ${currentPage}" />
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // 关闭事件
  const closeViewer = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  overlay.querySelector('.image-viewer-close').addEventListener('click', closeViewer);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('image-viewer-content')) {
      closeViewer();
    }
  });

  // ESC 键关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeViewer();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// 处理浏览器前进后退
window.addEventListener('popstate', (e) => {
  const path = window.location.pathname;
  
  // === 扩展路由钩子 ===
  if (window.PowerWikiExtensions) {
    for (const ext of Object.values(window.PowerWikiExtensions)) {
      const match = ext.matchRoute && ext.matchRoute(path);
      if (match) {
        ext.showView && ext.showView(match.tagName);
        return;
      }
    }
  }
  // === 扩展路由钩子结束 ===
  
  // 文章页面路由
  if (e.state && e.state.path) {
    loadPost(e.state.path);
  } else {
    // 首页
    homeView.classList.add('active');
    postView.classList.remove('active');
    // 隐藏所有扩展视图
    if (window.PowerWikiExtensions) {
      Object.values(window.PowerWikiExtensions).forEach(ext => ext.hideView && ext.hideView());
    }
    currentPost = null;

    // 更新 SEO meta 标签（首页）
    if (siteConfig) {
      const homeTitle = `${siteConfig.siteTitle || 'PowerWiki'} - ${siteConfig.siteDescription || '知识库'}`;
      document.title = homeTitle;
      updateSEOMetaTags({
        title: homeTitle,
        description: siteConfig.siteDescription || 'PowerWiki - 一个现代化的知识库系统',
        keywords: '知识库,文档,Markdown,Wiki',
        url: window.location.origin,
        type: 'website'
      });
    }

    // 检查首页是否有 README 内容，有则显示目录
    const homeContent = document.getElementById('homeContent');
    if (homeContent && homeContent.innerHTML.trim() !== '') {
      generateHomeTOC();
      // 为首页的代码块和图片也添加功能
      addCopyButtonsToCodeBlocks(homeContent);
      addImageZoomFeature(homeContent);
      renderMermaidBlocks(homeContent);
    } else {
      const tocSidebar = document.getElementById('tocSidebar');
      if (tocSidebar) {
        tocSidebar.style.display = 'none';
      }
    }
  }
});

// 渲染 Mermaid 图表（将 code.language-mermaid 替换为可渲染的 div）
async function renderMermaidBlocks(container = null) {
  if (typeof mermaid === 'undefined') return;
  const target = container || postBody;
  if (!target) return;

  const mermaidBlocks = target.querySelectorAll('code.language-mermaid');
  if (mermaidBlocks.length === 0) return;

  mermaidBlocks.forEach(code => {
    const pre = code.parentElement;
    const div = document.createElement('div');
    div.className = 'mermaid';
    const source = code.textContent;
    div.textContent = source;
    div.setAttribute('data-mermaid-source', source);
    pre.replaceWith(div);
  });

  try {
    await mermaid.run({ nodes: target.querySelectorAll('.mermaid') });
  } catch (err) {
    console.error('Mermaid render error:', err);
  }
}

// 为代码块添加复制按钮
function addCopyButtonsToCodeBlocks(container = null) {
  const targetContainer = container || postBody;
  if (!targetContainer) return;

  const codeBlocks = targetContainer.querySelectorAll('pre code');
  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.parentElement;
    // 避免重复添加
    if (pre.querySelector('.code-copy-btn')) return;

    // 创建复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.title = i18n.t('client.copyCode');
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M3 11V3a2 2 0 0 1 2-2h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <span class="copy-text">${i18n.t('client.copy')}</span>
    `;

    // 设置 pre 为相对定位
    pre.style.position = 'relative';

    // 添加点击事件
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const code = codeBlock.textContent || codeBlock.innerText;

      try {
        await navigator.clipboard.writeText(code);
        copyBtn.classList.add('copied');
        const copyText = copyBtn.querySelector('.copy-text');
        if (copyText) {
          copyText.textContent = i18n.t('client.copied');
        }
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          if (copyText) {
            copyText.textContent = i18n.t('client.copy');
          }
        }, 2000);
      } catch (err) {
        // 降级方案：使用传统方法
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          copyBtn.classList.add('copied');
          const copyText = copyBtn.querySelector('.copy-text');
          if (copyText) {
            copyText.textContent = i18n.t('client.copied');
          }
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            if (copyText) {
              copyText.textContent = i18n.t('client.copy');
            }
          }, 2000);
        } catch (err2) {
          showNotification(i18n.t('client.copyFailed'), 'error');
        }
        document.body.removeChild(textarea);
      }
    });

    pre.appendChild(copyBtn);
  });
}

// 为图片添加点击放大功能
function addImageZoomFeature(container = null) {
  const targetContainer = container || postBody;
  if (!targetContainer) return;

  const images = targetContainer.querySelectorAll('img:not(.pdf-page-img)');
  images.forEach((img) => {
    // 避免重复添加事件
    if (img.dataset.zoomEnabled === 'true') return;
    img.dataset.zoomEnabled = 'true';

    // 添加可点击样式
    img.style.cursor = 'zoom-in';

    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openImageModal(img.src, img.alt || '图片');
    });
  });
}

// 打开图片模态框
function openImageModal(imageSrc, imageAlt) {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'image-modal-overlay';
  overlay.innerHTML = `
    <div class="image-modal-header">
      <span class="image-modal-title">${escapeHtml(imageAlt)}</span>
      <button class="image-modal-close" title="关闭">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="image-modal-content">
      <img src="${imageSrc}" alt="${escapeHtml(imageAlt)}" />
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // 关闭事件
  const closeModal = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  overlay.querySelector('.image-modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('image-modal-content')) {
      closeModal();
    }
  });

  // ESC 键关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// 设置返回顶部按钮
function setupBackToTop() {
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (!backToTopBtn) return;

  // 初始隐藏按钮
  backToTopBtn.style.display = 'none';

  // 滚动监听
  let ticking = false;
  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > 300) {
          backToTopBtn.style.display = 'flex';
        } else {
          backToTopBtn.style.display = 'none';
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // 点击返回顶部
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

