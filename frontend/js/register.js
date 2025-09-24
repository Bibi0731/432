const API_BASE = "/auth";

document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) throw new Error("Register failed");

        alert("Register successful! Please login.");
        window.location.href = "login.html";
    } catch (err) {
        alert("Register failed: " + err.message);
    }
});
