const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// 健康检查
exports.healthCheck = (req, res) => {
    res.json({ status: 'ok' });
};

// 注册
exports.register = (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = userModel.findUserByUsername(username);
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const user = userModel.createUser(username, password, role || 'user');
    res.status(201).json({
        message: 'User registered',
        user: { id: user.id, username: user.username, role: user.role }
    });
};

// 登录
exports.login = (req, res) => {
    const { username, password } = req.body;
    const user = userModel.findUserByUsername(username);

    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({ token });
};

// 获取当前用户信息
exports.getUserInfo = (req, res) => {
    const user = req.user;

    // 转换时间戳为可读日期
    const formatDate = (ts) => new Date(ts * 1000).toLocaleString();

    res.json({
        user: {
            userId: user.userId,
            username: user.username,
            role: user.role,
            iat: formatDate(user.iat),
            exp: formatDate(user.exp)
        }
    });
};