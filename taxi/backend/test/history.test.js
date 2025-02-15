const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let userToken, adminToken;

beforeAll(async () => {
    console.log("🔹 Connexion de l'utilisateur...");
    const userRes = await request(app).post("/api/auth/login").send({
        identifier: "testuser@example.com",
        password: "password123"
    });

    console.log("🔹 Réponse connexion utilisateur :", userRes.body);
    expect(userRes.statusCode).toBe(200);
    userToken = userRes.body.accessToken;

    console.log("🔹 Suppression du compte admin s'il existe déjà...");
    await db.query("DELETE FROM users WHERE email = ?", ["admin@example.com"]);

    console.log("🔹 Création d'un compte admin...");
    const createAdminRes = await request(app).post("/api/auth/register").send({
        username: "admin",
        email: "admin@example.com",
        password: "admin123",
        phone_number: "0611111111",  
        full_name: "Admin Test",  
        user_type: "admin"
    });

    console.log("🔹 Réponse création admin :", createAdminRes.body);
    expect(createAdminRes.statusCode).toBe(201);

    console.log("🔹 Connexion de l'admin...");
    const adminRes = await request(app).post("/api/auth/login").send({
        identifier: "admin@example.com",
        password: "admin123"
    });

    console.log("🔹 Réponse connexion admin :", adminRes.body);
    expect(adminRes.statusCode).toBe(200);
    adminToken = adminRes.body.accessToken;
});

describe("📊 Historique et statistiques", () => {
    test("✅ Récupération de l'historique des actions", async () => {
        const res = await request(app)
            .get("/api/history/my-history")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse historique :", res.body);
        expect([200, 404]).toContain(res.statusCode); 
        if (res.statusCode === 200) {
            expect(Array.isArray(res.body)).toBe(true);
        }
    });

    test("✅ Récupération des statistiques (Admin)", async () => {
        const res = await request(app)
            .get("/api/settings/stats")
            .set("Authorization", `Bearer ${adminToken}`);

        console.log("🔹 Réponse statistiques admin :", res.body);
        expect([200, 404]).toContain(res.statusCode);  
        if (res.statusCode === 200) {
            expect(res.body).toHaveProperty("total_users");
            expect(res.body).toHaveProperty("total_rides");
            expect(res.body).toHaveProperty("total_payments");
        }
    });
});

afterAll(async () => {
    console.log("🔹 Suppression du compte admin après les tests...");
    await db.query("DELETE FROM users WHERE email = ?", ["admin@example.com"]);

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
