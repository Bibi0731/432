const API_BASE = "/auth"; // 走同域，不需要写 http://localhost:3000

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) throw new Error("Login failed");

        const data = await res.json();
        localStorage.setItem("token", data.token);

        // 解码 JWT 获取 role（或者直接请求 /auth/me）
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        console.log("JWT Payload:", payload);
        const role = payload.role;
        console.log("Decoded role:", role);

        if (role === "admin") {
            window.location.href = "admin.html"; // 管理员跳 admin
        } else {
            window.location.href = "dashboard.html"; // 普通用户跳 dashboard
        }
    } catch (err) {
        alert("Login failed: " + err.message);
    }
});
