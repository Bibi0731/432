// src/utils/pagination.js
const toInt = (v, def) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : def;
};

exports.getPaging = (req, opts = {}) => {
    const { defaultPageSize = 20, maxPageSize = 100 } = opts;
    const page = toInt(req.query.page, 1);
    let pageSize = toInt(req.query.pageSize, defaultPageSize);
    if (pageSize > maxPageSize) pageSize = maxPageSize;
    return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
};

exports.paginateArray = (allItems, paging, mapper) => {
    const { offset, limit, page, pageSize } = paging;
    const total = allItems.length;
    const sliced = allItems.slice(offset, offset + limit);
    const items = mapper ? sliced.map(mapper) : sliced;
    return { meta: { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) }, items };
};
