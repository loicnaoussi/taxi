const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let adminToken;

beforeAll(async () => {
    console.log("🔹 Vérification ou création d'un compte admin pour les tests du tableau de bord...");

    // ✅ 1️⃣ Supprimer l’ancien compte admin s’il existe
    console.log("🗑️ Suppression des anciens comptes admin...");
    await db.query("DELETE FROM users WHERE email = ?", ["admin_test@example.com"]);

    // ✅ 2️⃣ Création ou connexion de l’admin
    let adminRes = await request(app).post("/api/auth/login").send({
        identifier: "admin_test@example.com",
        password: "admin123"
    });

    if (adminRes.statusCode === 401) {
        console.log("🚨 Admin introuvable, création du compte admin de test...");

        const registerRes = await request(app).post("/api/auth/register").send({
            username: "admin_test",
            email: "admin_test@example.com",
            password: "admin123",
            phone_number: "0612349999", // Numéro unique
            full_name: "Admin Test",
            user_type: "admin",
        });

        if (registerRes.statusCode !== 201) {
            if (registerRes.body.message.includes("Email ou numéro de téléphone déjà utilisé")) {
                console.warn("⚠️ Email déjà utilisé. Tentative de connexion...");
                adminRes = await request(app).post("/api/auth/login").send({
                    identifier: "admin_test@example.com",
                    password: "admin123"
                });
            } else {
                console.error("❌ Échec de la création du compte admin :", registerRes.body);
                throw new Error("Échec de la création du compte admin de test");
            }
        } else {
            console.log("✅ Admin créé avec succès !");
            adminRes = await request(app).post("/api/auth/login").send({
                identifier: "admin_test@example.com",
                password: "admin123"
            });
        }
    }

    if (adminRes.statusCode !== 200) {
        console.error("❌ Échec de la connexion admin :", adminRes.body);
        throw new Error("Échec de la connexion admin de test");
    }

    adminToken = adminRes.body.accessToken;
    console.log("✅ Connexion admin réussie !");
});

describe("📊 Tableau de bord administrateur", () => {
    test("✅ Récupération des statistiques", async () => {
        const res = await request(app)
            .get("/api/admin/dashboard")
            .set("Authorization", `Bearer ${adminToken}`);

        console.log("🔹 Réponse statistiques :", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("totalUsers");
        expect(res.body).toHaveProperty("totalRides");
        expect(res.body).toHaveProperty("completedRides");
    });
});

afterAll(async () => {
    console.log("🗑️ Suppression du compte admin de test...");
    await db.query("DELETE FROM users WHERE email = ?", ["admin_test@example.com"]);

    console.log("🔹 Fermeture propre de la connexion MySQL...");
    await db.end(); // ✅ Ferme la connexion MySQL

    console.log("🛑 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
