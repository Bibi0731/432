const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const outputsController = require('../controllers/outputsController');

// 转码必须带 uploadId（从 URL 参数取）
router.post('/:uploadId', authenticate, outputsController.create);

// 其他 CRUD
router.get('/', authenticate, outputsController.getAllMine);
router.get('/:id', authenticate, outputsController.getOne);
router.patch('/:id', authenticate, outputsController.update);
router.delete('/:id', authenticate, outputsController.remove);

// 下载链接
router.get('/:id/download-link', authenticate, outputsController.getDownloadLink);

module.exports = router;
