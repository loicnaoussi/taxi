const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let userToken;

beforeAll(async () => {
    console.log("🔹 Création ou connexion du compte utilisateur pour les tests de vérification...");

    // ✅ Supprimer l’utilisateur s’il existe déjà
    await db.query("DELETE FROM users WHERE email = ?", ["verification_test@example.com"]);

    // ✅ Création ou connexion
    let userRes = await request(app).post("/api/auth/login").send({
        identifier: "verification_test@example.com",
        password: "password123"
    });

    if (userRes.statusCode === 401) {
        console.log("🚨 Utilisateur introuvable, création du compte...");
        const registerRes = await request(app).post("/api/auth/register").send({
            username: "verification_test",
            email: "verification_test@example.com",
            password: "password123",
            phone_number: "0611122233",
            full_name: "Verification User",
            user_type: "passenger"
        });

        if (registerRes.statusCode !== 201) {
            console.error("❌ Échec création utilisateur :", registerRes.body);
            throw new Error("Échec de création de l'utilisateur de test.");
        }

        userRes = await request(app).post("/api/auth/login").send({
            identifier: "verification_test@example.com",
            password: "password123"
        });
    }

    if (userRes.statusCode !== 200) {
        console.error("❌ Échec de connexion utilisateur :", userRes.body);
        throw new Error("Échec de connexion de l'utilisateur.");
    }

    userToken = userRes.body.accessToken;
    console.log(`✅ Connexion utilisateur réussie avec user_id ${userRes.body.user.user_id}`);
});

describe("🆔 Vérification d’identité", () => {
    jest.setTimeout(15000);

    test("✅ Envoi des fichiers de vérification", async () => {
        console.log("🔹 Envoi des fichiers de vérification...");

        const res = await request(app)
            .post("/api/verification/upload-verification")
            .set("Authorization", `Bearer ${userToken}`)
            .attach("verification_video", Buffer.from("dummy_video"), "video.mp4")
            .attach("cni_front", Buffer.from("dummy_front"), "cni_front.jpg")
            .attach("cni_back", Buffer.from("dummy_back"), "cni_back.jpg");

        console.log("🔹 Réponse envoi de vérification :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Fichiers de vérification envoyés avec succès !");
    });

    test("✅ Récupération du statut de vérification", async () => {
        console.log("🔹 Récupération du statut de vérification...");

        const res = await request(app)
            .get("/api/verification/status")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse statut vérification :", res.body);
        expect([200, 404]).toContain(res.statusCode);

        if (res.statusCode === 200) {
            expect(res.body).toHaveProperty("status");
        }
    });
});

// ✅ Fermeture propre de la connexion MySQL après tous les tests
afterAll(async () => {
    console.log("🔹 Suppression du compte utilisateur de test...");
    await db.query("DELETE FROM users WHERE email = ?", ["verification_test@example.com"]);

    console.log("🔹 Fermeture propre de la connexion MySQL...");
    await db.end(); // ✅ Fermeture propre de la connexion

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});

