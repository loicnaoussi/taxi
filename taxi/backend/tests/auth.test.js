jest.setTimeout(30000); // 🔥 Augmente le délai d’attente à 30 secondes
const request = require("supertest");
const { app, server } = require("../server");
const resetDatabase = require("./setupTestDB");
const db = require("../config/db");

beforeAll(async () => {
    await resetDatabase();

    // 🔍 Vérification des utilisateurs avant les tests
    const [users] = await db.query("SELECT email, password_hash, user_type FROM taxi_app_test.users");
    console.log("🔍 Utilisateurs test avant login :", users);
});

afterAll((done) => {
    server.close(() => {
        console.log("🚪 Serveur fermé après les tests.");
        done();
    });
});

describe("🔹 Tests de l'authentification (Passager, Chauffeur, Admin)", () => {
    /** ✅ TEST 1 - Inscription d'un PASSAGER */
    it("✅ Devrait inscrire un PASSAGER avec succès", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testpassenger",
                email: "passenger@example.com",
                password: "password123",
                full_name: "Test Passenger",
                phone_number: "0612345670",
                user_type: "passenger"
            });

        console.log("📨 Réponse du serveur (Inscription PASSAGER) :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Utilisateur inscrit avec succès !");
    });

    /** ✅ TEST 2 - Inscription d'un CHAUFFEUR */
    it("✅ Devrait inscrire un CHAUFFEUR avec succès", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testdriver",
                email: "driver@example.com",
                password: "password123",
                full_name: "Test Driver",
                phone_number: "0612345671",
                user_type: "driver"
            });

        console.log("📨 Réponse du serveur (Inscription CHAUFFEUR) :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Utilisateur inscrit avec succès !");
    });

    /** ✅ TEST 3 - Inscription d'un ADMIN */
    it("✅ Devrait inscrire un ADMIN avec succès", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testadmin",
                email: "admin@example.com",
                password: "password123",
                full_name: "Test Admin",
                phone_number: "0612345672",
                user_type: "admin"
            });

        console.log("📨 Réponse du serveur (Inscription ADMIN) :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Utilisateur inscrit avec succès !");
    });

    /** ❌ TEST 4 - Inscription avec un email invalide */
    it("❌ Devrait rejeter un utilisateur avec un email invalide", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "invaliduser",
                email: "invalidemail",
                password: "password123",
                full_name: "Invalid User",
                phone_number: "0612345673",
                user_type: "passenger"
            });

        console.log("📨 Réponse du serveur (Email Invalide) :", res.body);
        expect(res.statusCode).toBe(400);
    });

    /** ✅ TEST 5 - Connexion d'un PASSAGER */
    it("✅ Devrait permettre à un PASSAGER de se connecter", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "passenger@example.com",
                password: "password123"
            });

        console.log("📨 Réponse du serveur (Login PASSAGER) :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    /** ✅ TEST 6 - Connexion d'un CHAUFFEUR */
    it("✅ Devrait permettre à un CHAUFFEUR de se connecter", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "driver@example.com",
                password: "password123"
            });

        console.log("📨 Réponse du serveur (Login CHAUFFEUR) :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    /** ✅ TEST 7 - Connexion d'un ADMIN */
    it("✅ Devrait permettre à un ADMIN de se connecter", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "admin@example.com",
                password: "password123"
            });

        console.log("📨 Réponse du serveur (Login ADMIN) :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    /** ❌ TEST 8 - Connexion avec un mauvais mot de passe */
    it("❌ Devrait refuser la connexion avec un mauvais mot de passe", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "passenger@example.com",
                password: "wrongpassword"
            });

        console.log("📨 Réponse du serveur (Mauvais mot de passe) :", res.body);
        expect(res.statusCode).toBe(401);
    });

    /** ❌ TEST 9 - Connexion avec un email inexistant */
    it("❌ Devrait refuser la connexion avec un email inexistant", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "inexistant@example.com",
                password: "password123"
            });

        console.log("📨 Réponse du serveur (Email inexistant) :", res.body);
        expect(res.statusCode).toBe(401);
    });
});
