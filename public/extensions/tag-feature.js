/**
 * Tag 功能扩展模块
 * 提供文章标签的渲染和主题适配功能
 */
(function() {
  'use strict';

  // Tag 图标 SVG
  const TAG_ICON_SVG = `<svg class="tag-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.5V3a1 1 0 0 1 1-1h5.5a1 1 0 0 1 .7.3l5.5 5.5a1 1 0 0 1 0 1.4l-5.5 5.5a1 1 0 0 1-1.4 0L2.3 9.2a1 1 0 0 1-.3-.7z"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none"/></svg>`;

  /**
   * 计算色相的感知亮度权重（0~1）
   * 黄绿区域(60~120)人眼感知最亮 → 权重高
   * 蓝紫区域(220~280)人眼感知最暗 → 权重低
   * @param {number} hue - 色相值 (0-360)
   * @returns {number} 感知亮度因子 (0~1)
   */
  function getPerceptualWeight(hue) {
    const rad = hue * Math.PI / 180;
    return 0.5 + 0.25 * Math.cos(rad - 1.1);
  }

  /**
   * 根据 tag 字符串计算颜色（Outline 风格，感知亮度补偿）
   * 借鉴 Carbon/Semi Design 的色阶思路，通过感知补偿确保
   * 所有色相在亮/暗模式下都有足够对比度
   * @param {string} tag - 标签文本
   * @returns {Object} { color, hoverBg }
   */
  function getTagColors(tag) {
    // 计算字符串哈希值
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // 转换为32位整数
    }
    
    // 将哈希值映射到色相 (0-360)
    const hue = Math.abs(hash) % 360;
    
    // 检测当前主题
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // 感知亮度补偿
    const weight = getPerceptualWeight(hue);
    
    if (isDark) {
      // 暗色模式：感知暗的色相(蓝/紫, weight低) → 提亮
      //           感知亮的色相(黄/绿, weight高) → 适度压暗
      const lightness = 78 - weight * 18;  // 蓝紫~75%, 黄绿~65%
      const color = `hsl(${hue}, 75%, ${lightness}%)`;
      const hoverBg = `hsla(${hue}, 60%, 50%, 0.2)`;
      return { color, hoverBg };
    } else {
      // 亮色模式：感知亮的色相(黄/青, weight高) → 压暗
      //           感知暗的色相(蓝/紫, weight低) → 稍浅
      const lightness = 32 + (1 - weight) * 10;  // 黄绿~32%, 蓝紫~42%
      const color = `hsl(${hue}, 70%, ${lightness}%)`;
      const hoverBg = `hsl(${hue}, 55%, 93%)`;
      return { color, hoverBg };
    }
  }

  /**
   * 渲染 Tags（支持点击跳转）
   * @param {Array} tags - 标签数组
   * @param {Function} escapeHtmlFn - HTML 转义函数
   */
  function renderTags(tags, escapeHtmlFn) {
    const postTags = document.getElementById('postTags');
    if (!postTags) return;
    
    if (tags && tags.length > 0) {
      postTags.innerHTML = tags.map(tag => {
        const colors = getTagColors(tag);
        const encodedTag = encodeURIComponent(tag);
        return `<a href="/tag/${encodedTag}" class="tag-item" style="color: ${colors.color}; text-decoration: none;" onmouseenter="this.style.background='${colors.hoverBg}'" onmouseleave="this.style.background='transparent'">${TAG_ICON_SVG}${escapeHtmlFn(tag)}</a>`;
      }).join('');
      postTags.style.display = 'flex';
    } else {
      postTags.innerHTML = '';
      postTags.style.display = 'none';
    }
  }

  /**
   * 刷新 Tag 颜色（用于主题切换时）
   */
  function refreshTagColors() {
    const tagItems = document.querySelectorAll('.tag-item');
    tagItems.forEach(item => {
      const tag = item.textContent.trim();
      const colors = getTagColors(tag);
      item.style.color = colors.color;
      item.onmouseenter = () => item.style.background = colors.hoverBg;
      item.onmouseleave = () => item.style.background = 'transparent';
    });
  }

  // 导出到全局
  window.TagFeature = {
    render: renderTags,
    refresh: refreshTagColors,
    getTagColors: getTagColors,
    TAG_ICON_SVG: TAG_ICON_SVG
  };
})();
