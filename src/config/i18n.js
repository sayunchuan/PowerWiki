/**
 * 多语言支持
 */

const fs = require('fs');
const path = require('path');
const env = require('./env');

let translations = {};

/**
 * 加载翻译文件
 */
function loadTranslations() {
  try {
    const langFile = path.join(__dirname, '..', '..', 'locales', `${env.LANG}.json`);
    if (fs.existsSync(langFile)) {
      translations = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    } else {
      const fallbackFile = path.join(__dirname, '..', '..', 'locales', 'zh-CN.json');
      translations = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    }
  } catch (error) {
    console.error('Failed to load translations:', error);
    translations = {};
  }
}

/**
 * 翻译函数
 * @param {string} key - 翻译键，支持点号分隔的嵌套键
 * @param {...any} args - 可变参数，用于替换翻译中的占位符 {0}, {1} 等
 * @returns {string} 翻译后的文本
 */
function t(key, ...args) {
  const keys = key.split('.');
  let value = translations;

  for (const k of keys) {
    value = value?.[k];
  }

  if (typeof value === 'string' && args.length > 0) {
    return value.replace(/{(\d+)}/g, (match, index) => args[index] || match);
  }

  return value || key;
}

// 加载翻译文件
loadTranslations();

// 监听语言变化并重新加载
if (require.cache[require.resolve('./env')]) {
  const originalRequire = require;
  require.cache[require.resolve('./env')].exports = new Proxy(require.cache[require.resolve('./env')].exports, {
    set: (target, prop, value) => {
      if (prop === 'LANG') {
        // 语言设置变更，重新加载翻译
        target[prop] = value;
        loadTranslations();
        return true;
      }
      target[prop] = value;
      return true;
    }
  });
}

module.exports = { t, loadTranslations, getLang: () => env.LANG };
