// src/models/uploadModel.js
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/db.json');

function readDB() {
    if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        fs.writeFileSync(dbPath, JSON.stringify({ users: [], uploads: [] }, null, 2));
    }
    const data = fs.readFileSync(dbPath, 'utf8') || '{}';
    const json = JSON.parse(data);
    if (!json.uploads) json.uploads = [];
    if (!json.users) json.users = [];
    return json;
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

exports.create = (record) => {
    const db = readDB();
    const uploads = db.uploads || [];
    const newItem = { id: uploads.length ? (Math.max(...uploads.map(u => u.id)) + 1) : 1, ...record };
    uploads.push(newItem);
    db.uploads = uploads;
    writeDB(db);
    return newItem;
};

exports.getById = (id) => {
    const db = readDB();
    return (db.uploads || []).find(u => String(u.id) === String(id));
};

exports.getByOwner = (ownerId) => {
    const db = readDB();
    return (db.uploads || []).filter(u => String(u.ownerId) === String(ownerId));
};

exports.update = (id, ownerId, patch) => {
    const db = readDB();
    const uploads = db.uploads || [];
    const idx = uploads.findIndex(u => String(u.id) === String(id));
    if (idx === -1) return null;
    const item = uploads[idx];
    if (String(item.ownerId) !== String(ownerId)) return 'forbidden';
    uploads[idx] = { ...item, ...patch, updatedAt: Date.now() };
    db.uploads = uploads;
    writeDB(db);
    return uploads[idx];
};

exports.remove = (id, ownerId) => {
    const db = readDB();
    const uploads = db.uploads || [];
    const idx = uploads.findIndex(u => String(u.id) === String(id));
    if (idx === -1) return null;
    const item = uploads[idx];
    if (String(item.ownerId) !== String(ownerId)) return 'forbidden';
    uploads.splice(idx, 1);
    db.uploads = uploads;
    writeDB(db);
    return item; // 返回被删的记录（用于同时删物理文件）
};

exports.getAll = () => {
    const db = readDB();
    return db.uploads || [];
};