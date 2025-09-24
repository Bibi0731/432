// src/routes/uploads.js
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadsController = require('../controllers/uploadsController');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'data/uploads';

// 确保目录存在
const fs = require('fs');
fs.mkdirSync(path.join(process.cwd(), UPLOAD_DIR), { recursive: true });



// 路由（全部需要登录）
router.post('/', authenticate, upload.single('file'), uploadsController.create);
router.get('/', authenticate, uploadsController.getAllMine);                           // 查询自己所有（分页）
router.get('/:id', authenticate, uploadsController.getOne);                            // 查询单条
router.patch('/:id', authenticate, uploadsController.update);                          // 更新元数据
router.delete('/:id', authenticate, uploadsController.remove);                         // 删除记录+物理文件
// 下载链接
router.get('/:id/download-link', authenticate, uploadsController.getDownloadLink);

module.exports = router;
