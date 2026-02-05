const express = require('express');
const router = express.Router();
const cacheManager = require('../../utils/cacheManager');
const { t } = require('../../config/i18n');

router.get('/stats', (req, res) => {
  res.json(cacheManager.getStats());
});

router.post('/clear', (req, res) => {
  const { type, key } = req.body;

  if (type) {
    cacheManager.delete(type, key);
    res.json({ success: true, message: t('cache.clearedType', `${type}${key ? `/${key}` : ''}`) });
  } else {
    cacheManager.clear();
    res.json({ success: true, message: t('cache.clearedAll') });
  }
});

module.exports = router;
