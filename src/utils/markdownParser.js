/**
 * Markdown Parser
 *
 * Markdown 解析模块
 * 负责将 Markdown 文本转换为 HTML，并提取标题和描述
 * 支持 YAML Frontmatter 解析
 *
 * @module markdownParser
 */

const { marked } = require('marked');
const hljs = require('highlight.js');
const { t } = require('../config/i18n');

const highlightCode = function(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch (err) {
      console.error(`❌ ${t('markdown.highlightError')}:`, err);
    }
  }
  return hljs.highlightAuto(code).value;
};

// 配置 marked 选项
try {
  if (typeof marked.setOptions === 'function') {
    marked.setOptions({
      highlight: highlightCode,
      breaks: true,
      gfm: true
    });
  } else if (typeof marked.use === 'function') {
    marked.use({
      highlight: highlightCode,
      breaks: true,
      gfm: true
    });
  }
} catch (err) {
  console.warn(`⚠️  ${t('markdown.configMarkedFailed')}:`, err);
}

function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      content: markdown
    };
  }

  const frontmatterText = match[1];
  const content = match[2];
  const frontmatter = {};

  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.substring(1, value.length - 1)
          .split(',')
          .map(v => v.trim())
          .filter(v => v);
      }

      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    content
  };
}

function extractTitle(markdown) {
  const lines = markdown.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  return '无标题';
}

function extractDescription(markdown) {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```') && !trimmed.startsWith('![')) {
      return trimmed.substring(0, 150) + (trimmed.length > 150 ? '...' : '');
    }
  }
  return '';
}

function transformLocalImagePaths(markdown, filePath) {
  const lastSlashIndex = filePath.lastIndexOf('/');
  const mdDir = lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';

  return markdown.replace(/!\[([^\]]*)\]\((images[^)]*)\)/g, (match, alt, imagePath) => {
    const cleanImagePath = imagePath.replace(/^\.?\//, '');
    const apiPath = mdDir ? `/api/image/${mdDir}/${cleanImagePath}` : `/api/image/${cleanImagePath}`;
    return `![${alt}](${apiPath})`;
  });
}

function parseMarkdown(markdown, filePath = '') {
  const { frontmatter, content } = parseFrontmatter(markdown);

  let processedContent = content;
  if (filePath) {
    processedContent = transformLocalImagePaths(content, filePath);
  }

  let html;
  try {
    if (typeof marked.parse === 'function') {
      html = marked.parse(processedContent);
    } else if (typeof marked === 'function') {
      html = marked(content);
    } else {
      html = processedContent;
    }
  } catch (err) {
    console.error(`❌ ${t('markdown.parseError')}:`, err);
    html = processedContent;
  }

  const title = frontmatter.title || extractTitle(content);
  const description = frontmatter.description || extractDescription(content);
  const keywords = frontmatter.keywords || '';
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags || '').split(',').map(t => t.trim()).filter(t => t);

  return {
    html,
    title,
    description,
    keywords,
    tags,
    frontmatter,
    raw: content
  };
}

module.exports = {
  parseMarkdown,
  extractTitle,
  extractDescription,
  transformLocalImagePaths
};
