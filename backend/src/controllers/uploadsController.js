const fs = require("fs");
const path = require("path");
const uploadModel = require("../models/uploadModel");
const { getPaging, paginateArray } = require("../utils/pagination");
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// 从环境变量读取
const bucketName = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const s3 = new S3Client({ region });

// ---------------- 上传文件 ----------------
exports.create = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // 读取临时文件内容
        const filePath = path.join(process.cwd(), req.file.path);
        const fileContent = fs.readFileSync(filePath);

        // 上传到 S3
        const s3Key = `uploads/${req.file.filename}`;
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent,
            ContentType: req.file.mimetype,
        }));

        // 删除临时文件
        fs.unlinkSync(filePath);

        // 记录到 model
        const { displayName = "", note = "" } = req.body || {};
        const ownerId = req.user.userId;

        const record = uploadModel.create({
            ownerId,
            filename: s3Key,
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
        console.error("Upload create error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
};

// ---------------- 查询我的所有上传 ----------------
exports.getAllMine = (req, res) => {
    const ownerId = req.user.userId;
    const all = uploadModel.getByOwner(ownerId);
    const paging = getPaging(req, { defaultPageSize: 10, maxPageSize: 100 });

    const q = (req.query.q || "").toLowerCase();
    const filtered = q
        ? all.filter(x =>
            (x.displayName || "").toLowerCase().includes(q) ||
            (x.originalName || "").toLowerCase().includes(q)
        )
        : all;

    const result = paginateArray(filtered, paging);

    res.json({
        items: result.items,
        page: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalItems
    });
};

// ---------------- 查询单个 ----------------
exports.getOne = (req, res) => {
    const ownerId = req.user.userId;
    const item = uploadModel.getById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    if (String(item.ownerId) !== String(ownerId)) return res.status(403).json({ error: "Forbidden" });
    res.json(item);
};

// ---------------- 更新元数据 ----------------
exports.update = (req, res) => {
    const ownerId = req.user.userId;
    const id = req.params.id;
    const patch = {
        displayName: req.body.displayName,
        note: req.body.note
    };
    const updated = uploadModel.update(id, ownerId, patch);
    if (updated === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
};

// ---------------- 删除文件 + 记录 ----------------
exports.remove = async (req, res) => {
    const ownerId = req.user.userId;
    const id = req.params.id;
    const removed = uploadModel.remove(id, ownerId);

    if (removed === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (!removed) return res.status(404).json({ error: "Not found" });

    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: removed.filename
        }));
    } catch (err) {
        console.error("S3 delete error:", err);
    }

    res.status(200).json({
        message: "File deleted successfully",
        deleted: {
            id: removed.id,
            filename: removed.filename,
            originalName: removed.originalName,
            displayName: removed.displayName,
            note: removed.note
        }
    });
};

// ---------------- 获取下载链接 ----------------
exports.getDownloadLink = async (req, res) => {
    const ownerId = req.user.userId;
    const item = uploadModel.getById(req.params.id);

    if (!item || String(item.ownerId) !== String(ownerId)) {
        return res.status(404).json({ error: "Not found" });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: item.filename
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        res.json({ downloadUrl: url });
    } catch (err) {
        console.error("Presign error:", err);
        res.status(500).json({ error: "Could not generate download link" });
    }
};
