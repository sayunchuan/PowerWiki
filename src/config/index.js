const fs = require('fs');
const path = require('path');
const { t } = require('../../config/i18n');

function loadConfig() {
  try {
    const config = require(path.join(__dirname, '../../config.json'));

    if (!config.gitRepo) {
      console.error(t('error.configError'));
      process.exit(1);
    }

    config.pages = config.pages || {};
    config.pages.home = config.pages.home || '';
    config.pages.about = config.pages.about || '';

    return config;
  } catch (error) {
    console.error(t('error.configLoadFailed'));
    console.error(t('error.configCopyTip'));
    process.exit(1);
  }
}

module.exports = loadConfig;
