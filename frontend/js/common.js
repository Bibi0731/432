// 后端 API 根路径（同域部署可以简写为 ""）
const API_BASE = "";

// 从 localStorage 里获取 token
function getToken() {
    return localStorage.getItem("token");
}

// 退出登录
function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

// 请求带 token
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!options.headers) options.headers = {};
    if (token) options.headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_BASE + url, options);
    if (!res.ok) throw new Error("API Error: " + res.status);
    return res.json();
}
