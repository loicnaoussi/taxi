const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db"); // ✅ Importation de la base de données

let userToken, adminToken, reportId;

beforeAll(async () => {
    console.log("🔹 Connexion de l'utilisateur pour les tests des signalements...");
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
        phone_number: "0611111111",  // ✅ Ajout du numéro de téléphone
        full_name: "Admin Test",  // ✅ Ajout du champ `full_name` pour éviter l'erreur
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

describe("⚠️ Signalements et incidents", () => {
    test("✅ Signaler un problème", async () => {
        const res = await request(app).post("/api/reports/report")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                ride_id: 1,
                issue_type: "problème de paiement",
                description: "Erreur de facturation"
            });

        console.log("🔹 Réponse signalement :", res.body);
        expect(res.statusCode).toBe(201);
        reportId = res.body.report_id;
        expect(reportId).toBeDefined();
    });

    test("✅ Mettre à jour un signalement (Admin)", async () => {
        expect(reportId).toBeDefined();
        const res = await request(app).put(`/api/reports/admin/update/${reportId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "reviewed"
            });

        console.log("🔹 Réponse mise à jour signalement :", res.body);
        expect(res.statusCode).toBe(200);
    });
});

afterAll(async () => {
    console.log("🔹 Suppression du compte admin après les tests...");
    await db.query("DELETE FROM users WHERE email = ?", ["admin@example.com"]);

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
