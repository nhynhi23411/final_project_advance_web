/**
 * Seed admin + test user accounts via the register API.
 * Usage: node scripts/seed-admin.js
 */
const BASE = "http://localhost:3000/api/auth";

const accounts = [
    {
        name: "Admin1",
        username: "admin1",
        email: "admin@lostfound.com",
        password: "admin123",
        phone: "0900000002",
        role: "ADMIN",
    },
    {
        name: "Test User11",
        username: "testuser11",
        email: "testuser11@lostfound.com",
        password: "test123456",
        phone: "0900000003",
        role: "ADMIN",
    },
];

async function seed() {
    for (const acc of accounts) {
        try {
            const res = await fetch(`${BASE}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(acc),
            });
            const data = await res.json();
            if (res.ok) {
                console.log(`[OK] ${acc.role} "${acc.username}" created`);
            } else {
                console.log(`[SKIP] ${acc.username}: ${data.message || JSON.stringify(data)}`);
            }
        } catch (err) {
            console.error(`[ERR] ${acc.username}:`, err.message);
        }
    }
}

seed();
