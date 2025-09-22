// src/controllers/uploadsController.js
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const uploadModel = require('../models/uploadModel');
const { getPaging, paginateArray } = require('../utils/pagination');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'data/uploads';


exports.create = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { displayName = '', note = '' } = req.body || {};
        const ownerId = req.user.userId; // 来自 authenticate 中间件

        const record = uploadModel.create({
            ownerId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            displayName,
            note,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        res.status(201).json(record);
    } catch (err) {
        console.error('Upload create error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
};

exports.getAllMine = (req, res) => {
    const ownerId = req.user.userId;
    const all = uploadModel.getByOwner(ownerId);
    const paging = getPaging(req, { defaultPageSize: 10, maxPageSize: 100 });

    // 可选：关键词过滤
    const q = (req.query.q || '').toLowerCase();
    const filtered = q
        ? all.filter(x => (x.displayName || '').toLowerCase().includes(q) || (x.originalName || '').toLowerCase().includes(q))
        : all;

    const result = paginateArray(filtered, paging);
    res.json(result);
};

exports.getOne = (req, res) => {
    const ownerId = req.user.userId;
    const id = req.params.id;
    const item = uploadModel.getById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (String(item.ownerId) !== String(ownerId)) return res.status(403).json({ error: 'Forbidden' });
    res.json(item);
};

exports.update = (req, res) => {
    const ownerId = req.user.userId;
    const id = req.params.id;
    // 允许更新的字段（元数据）
    const patch = {
        displayName: req.body.displayName,
        note: req.body.note
    };
    const updated = uploadModel.update(id, ownerId, patch);
    if (updated === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
};

exports.remove = async (req, res) => {
    const ownerId = req.user.userId;
    const id = req.params.id;
    const removed = uploadModel.remove(id, ownerId);

    if (removed === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (!removed) return res.status(404).json({ error: 'Not found' });

    // 删除物理文件
    const fullPath = path.join(process.cwd(), UPLOAD_DIR, removed.filename);
    try {
        await fse.remove(fullPath);
    } catch {
        // 忽略删除文件时的错误
    }

    // 返回删除成功消息和被删记录的关键信息
    res.status(200).json({
        message: 'File deleted successfully',
        deleted: {
            id: removed.id,
            filename: removed.filename,
            originalName: removed.originalName,
            displayName: removed.displayName,
            note: removed.note
        }
    });
};
