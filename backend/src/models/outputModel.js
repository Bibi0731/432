const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/db.json');

function readDB() {
    if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        fs.writeFileSync(dbPath, JSON.stringify({ users: [], uploads: [], outputs: [] }, null, 2));
    }
    const data = fs.readFileSync(dbPath, 'utf8') || '{}';
    const json = JSON.parse(data);
    if (!json.outputs) json.outputs = [];
    if (!json.uploads) json.uploads = [];
    if (!json.users) json.users = [];
    return json;
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

exports.create = (record) => {
    const db = readDB();
    const outputs = db.outputs || [];
    const newItem = {
        id: outputs.length ? (Math.max(...outputs.map(o => o.id)) + 1) : 1,
        ...record
    };
    outputs.push(newItem);
    db.outputs = outputs;
    writeDB(db);
    return newItem;
};

exports.getById = (id) => {
    const db = readDB();
    return (db.outputs || []).find(o => String(o.id) === String(id));
};

exports.getByOwner = (ownerId) => {
    const db = readDB();
    return (db.outputs || []).filter(o => String(o.ownerId) === String(ownerId));
};

exports.update = (id, ownerId, patch) => {
    const db = readDB();
    const outputs = db.outputs || [];
    const idx = outputs.findIndex(o => String(o.id) === String(id));
    if (idx === -1) return null;
    const item = outputs[idx];
    if (String(item.ownerId) !== String(ownerId)) return 'forbidden';
    outputs[idx] = { ...item, ...patch, updatedAt: Date.now() };
    db.outputs = outputs;
    writeDB(db);
    return outputs[idx];
};

exports.remove = (id, ownerId) => {
    const db = readDB();
    const outputs = db.outputs || [];
    const idx = outputs.findIndex(o => String(o.id) === String(id));
    if (idx === -1) return null;
    const item = outputs[idx];
    if (String(item.ownerId) !== String(ownerId)) return 'forbidden';
    outputs.splice(idx, 1);
    db.outputs = outputs;
    writeDB(db);
    return item;
};

exports.getAll = () => {
    const db = readDB();
    return db.outputs || [];
};
