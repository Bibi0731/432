const outputModel = require('../models/outputModel');
const uploadModel = require('../models/uploadModel');
const path = require('path');
const fse = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'data/uploads';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'data/outputs';

// 创建转码结果
exports.create = async (req, res) => {
    const ownerId = req.user.userId;
    const uploadId = req.params.uploadId;   // 从 URL 参数取
    const { displayName, note } = req.body;

    const upload = uploadModel.getById(uploadId);
    if (!upload || String(upload.ownerId) !== String(ownerId)) {
        return res.status(404).json({ error: 'Upload not found' });
    }

    const srcPath = path.join(process.cwd(), UPLOAD_DIR, upload.filename);

    // 输出文件路径
    const outFile = `${upload.filename.replace(path.extname(upload.filename), '')}-transcoded.mp4`;
    const destPath = path.join(process.cwd(), OUTPUT_DIR, outFile);
    await fse.ensureDir(path.join(process.cwd(), OUTPUT_DIR));

    ffmpeg(srcPath)
        .outputOptions([
            '-c:v libx264',
            '-preset fast',
            '-crf 28',
            '-c:a aac',
            '-b:a 128k',
        ])
        .on('start', (cmd) => {
            console.log('FFmpeg command:', cmd);
        })
        .on('progress', (progress) => {
            console.log(`Processing: ${progress.percent}% done`);
        })
        .on('end', async () => {
            let fileSize = 0;
            try {
                const stat = await fse.stat(destPath);
                fileSize = stat.size;
            } catch { }

            const newOutput = outputModel.create({
                ownerId,
                uploadId,
                filename: outFile,
                originalName: upload.originalName,
                mimeType: 'video/mp4',
                size: fileSize,
                displayName: displayName || `${upload.displayName || upload.originalName} (transcoded)`,
                note: note || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return res.status(201).json({
                message: 'Transcode complete',
                source: {
                    uploadId: upload.id,
                    originalName: upload.originalName,
                    displayName: upload.displayName
                },
                output: newOutput
            });
        })
        .on('error', (err) => {
            console.error('FFmpeg error:', err);
            return res.status(500).json({ error: 'Transcoding failed', details: err.message });
        })
        .save(destPath);
};

// 获取当前用户所有转码结果
exports.getAllMine = (req, res) => {
    const ownerId = req.user.userId;
    const items = outputModel.getByOwner(ownerId);
    res.json(items);
};

// 获取单个转码结果
exports.getOne = (req, res) => {
    const ownerId = req.user.userId;
    const item = outputModel.getById(req.params.id);
    if (!item || String(item.ownerId) !== String(ownerId)) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
};

// 更新转码元信息
exports.update = (req, res) => {
    const ownerId = req.user.userId;
    const updated = outputModel.update(req.params.id, ownerId, req.body);
    if (updated === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({ message: 'Output updated', output: updated });
};

// 删除转码结果
exports.remove = async (req, res) => {
    const ownerId = req.user.userId;
    const removed = outputModel.remove(req.params.id, ownerId);
    if (removed === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (!removed) return res.status(404).json({ error: 'Not found' });

    // 删除物理文件
    const fullPath = path.join(process.cwd(), OUTPUT_DIR, removed.filename);
    try {
        await fse.remove(fullPath);
    } catch { }

    res.json({ message: 'Output deleted', deleted: removed });
};
