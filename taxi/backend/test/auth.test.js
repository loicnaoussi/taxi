const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

jest.setTimeout(30000);

let token;

beforeAll(async () => {
    try {
        console.log("🔹 Suppression des anciens utilisateurs et trajets de test...");
        await db.query("DELETE FROM rides WHERE passenger_id IN (SELECT user_id FROM users WHERE email LIKE 'testuser%')");
        await db.query("DELETE FROM rides WHERE driver_id IN (SELECT user_id FROM users WHERE email LIKE 'testuser%')");
        await db.query("DELETE FROM users WHERE email LIKE 'testuser%' OR phone_number = '0612345678'");
        console.log("✅ Suppression terminée !");
    } catch (error) {
        console.error("⚠️ Erreur lors de la suppression des anciens utilisateurs :", error.message);
    }
});

describe("🔹 Authentification & Utilisateurs", () => {

    test("✅ Inscription d'un nouvel utilisateur", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testuser",
                email: "testuser@example.com",
                phone_number: "0612345678",
                password: "password123",
                full_name: "Test User",
                user_type: "passenger"
            });

        console.log("🔹 Réponse inscription :", res.body);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("message", "Utilisateur inscrit avec succès !");
    });

    test("✅ Connexion de l'utilisateur", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                identifier: "testuser@example.com",
                password: "password123"
            });

        console.log("🔹 Réponse connexion :", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("accessToken");

        token = res.body.accessToken;
        expect(token).toBeDefined();
    });

    test("✅ Mise à jour du profil", async () => {
        if (!token) {
            throw new Error("❌ Token non défini, impossible de continuer les tests !");
        }

        const res = await request(app)
            .put("/api/users/update")
            .set("Authorization", `Bearer ${token}`)
            .send({
                username: "testuserUpdated",
                full_name: "Test User Updated"
            });

        console.log("🔹 Réponse mise à jour du profil :", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Profil mis à jour avec succès !");
    });
});

afterAll(async () => {
    try {
        console.log("🔹 Fermeture du serveur...");
        await db.end(); // Fermer la connexion MySQL proprement
        server.close();
        console.log("✅ Serveur et connexion à la base de données fermés !");
    } catch (error) {
        console.error("⚠️ Erreur lors de la fermeture du serveur :", error.message);
    }
});
