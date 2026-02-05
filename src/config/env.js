/**
 * 环境变量配置管理
 */

const path = require('path');

const env = {
  CONFIG_PATH: process.env.CONFIG_PATH || path.join(__dirname, '..', '..', 'config.json'),
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, '..', '..'),
  GIT_CACHE_DIR: process.env.GIT_CACHE_DIR || path.join(__dirname, '..', '..', '.git-cache'),
  LANG: process.env.LANG || 'zh-CN'
};

module.exports = env;
