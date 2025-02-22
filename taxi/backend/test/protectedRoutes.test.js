const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let userToken;
let testUserId;

beforeAll(async () => {
    console.log("🔹 Connexion ou création d'un utilisateur de test...");

    // ✅ Vérifier et supprimer les utilisateurs de test existants
    await db.query("DELETE FROM users WHERE email LIKE 'testuser%'");

    let userRes = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "testuser@example.com", password: "password123" });

    if (userRes.statusCode === 401) {
        console.log("🚨 Utilisateur introuvable, création du compte...");
        await request(app)
            .post("/api/auth/register")
            .send({
                username: "testuser",
                email: "testuser@example.com",
                password: "password123",
                phone_number: "0612345678",
                full_name: "Test User",
                user_type: "passenger"
            });

        userRes = await request(app)
            .post("/api/auth/login")
            .send({ identifier: "testuser@example.com", password: "password123" });
    }

    expect(userRes.statusCode).toBe(200);
    userToken = userRes.body.accessToken;
    testUserId = userRes.body.user.user_id;
    console.log(`✅ Connexion réussie avec user_id: ${testUserId}`);
});


describe("🔒 Tests des routes protégées", () => {
    
    test("🚫 Accès refusé à une route protégée sans JWT", async () => {
        const res = await request(app).get("/api/protected");
        console.log("🔹 Réponse sans JWT :", res.body);
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("message");
    });

    test("✅ Accès autorisé à une route protégée avec JWT valide", async () => {
        const res = await request(app)
            .get("/api/protected")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse avec JWT :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("status", "success");
        expect(res.body).toHaveProperty("message", "Bienvenue dans la route protégée !");
    });

    test("✅ Récupération du profil de l'utilisateur connecté", async () => {
        const res = await request(app)
            .get("/api/protected/profile")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse récupération profil :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("status", "success");
        expect(res.body).toHaveProperty("message", "Accès autorisé à l'espace protégé.");
        expect(res.body).toHaveProperty("user");
        expect(res.body.user).toHaveProperty("user_id", testUserId);
        expect(res.body.user).toHaveProperty("email", "testuser@example.com");
    });

    test("🚫 Accès refusé au profil sans JWT", async () => {
        const res = await request(app).get("/api/protected/profile");
        console.log("🔹 Réponse récupération profil sans JWT :", res.body);
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("message");
    });

    test("🔥 Erreur serveur simulée (mauvaise requête SQL)", async () => {
        jest.spyOn(db, "query").mockRejectedValueOnce(new Error("Erreur SQL simulée"));

        const res = await request(app)
            .get("/api/protected/profile")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse erreur serveur simulée :", res.body);
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty("status", "error");
        expect(res.body).toHaveProperty("message", "Erreur serveur.");

        // Restaurer le comportement normal après le test
        db.query.mockRestore();
    });

});

afterAll(async () => {
    console.log("🔹 Suppression de l'utilisateur de test...");
    await db.query("DELETE FROM users WHERE email = ?", ["testuser@example.com"]);

    console.log("🔹 Fermeture propre de la connexion MySQL...");
    await db.end();  // ✅ Fermer la connexion MySQL après les tests

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});

