/**
 * Static Routes
 *
 * 静态文件路由模块
 * 包含图片、PDF 等静态文件的访问
 *
 * @module routes/static
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { t } = require('../config/i18n');

/**
 * 创建静态文件路由
 */
function createStaticRoutes(options) {
  const router = express.Router();
  const { gitManager } = options;

  // API: 获取本地图片文件
  router.get('/image/*', async (req, res) => {
    try {
      let imagePath = req.params[0];

      try {
        let decodedPath = decodeURIComponent(imagePath);
        if (decodedPath.includes('%')) {
          decodedPath = decodeURIComponent(decodedPath);
        }
        imagePath = decodedPath;
      } catch (e) {
        console.warn(`⚠️  ${t('static.imagePathDecodeFailed')}:`, imagePath);
      }

      const fullPath = path.join(gitManager.repoPath, imagePath);

      if (!await fs.pathExists(fullPath)) {
        console.warn(`⚠️  ${t('static.imageNotFound')}:`, fullPath);
        return res.status(404).send(t('static.imageNotFound'));
      }

      const imageBuffer = await fs.readFile(fullPath);
      const fileName = path.basename(imagePath);

      const ext = path.extname(imagePath).toLowerCase();
      const contentTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      res.send(imageBuffer);
    } catch (error) {
      console.error(`❌ ${t('static.getImageFailed')}:`, error);
      res.status(404).send(t('static.imageNotFound'));
    }
  });

  // API: 获取 PDF 文件
  router.get('/pdf/*', async (req, res) => {
    try {
      let filePath = req.params[0];
      try {
        filePath = decodeURIComponent(filePath);
      } catch (e) {
        console.warn(`⚠️  ${t('static.pathDecodeFailed')}:`, filePath);
      }

      if (!filePath.endsWith('.pdf')) {
        return res.status(400).json({ error: t('static.notPdfFile') });
      }

      const pdfBuffer = await gitManager.readPdfFile(filePath);
      const fileName = path.basename(filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error(`❌ ${t('static.getPdfFailed')}:`, error);
      res.status(404).json({ error: t('static.pdfNotFound') });
    }
  });

  return router;
}

module.exports = { createStaticRoutes };
