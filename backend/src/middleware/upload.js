const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'data/uploads';

// 确保目录存在
fs.mkdirSync(path.join(process.cwd(), UPLOAD_DIR), { recursive: true });

// 存储策略
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(process.cwd(), UPLOAD_DIR));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '';
        cb(null, `${uuidv4()}${ext}`);
    }
});

// 上传中间件
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 默认 10GB
});

module.exports = upload;
