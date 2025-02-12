const request = require("supertest");
const { app, server } = require("../server");

let userToken;

beforeAll(async () => {
    console.log("🔹 Connexion de l'utilisateur pour les tests de vérification...");

    // Connexion utilisateur
    const userRes = await request(app).post("/api/auth/login").send({
        identifier: "testuser@example.com",
        password: "password123"
    });

    console.log("🔹 Réponse connexion utilisateur :", userRes.body);

    if (userRes.statusCode !== 200) {
        throw new Error("Échec de connexion de l'utilisateur.");
    }

    userToken = userRes.body.accessToken;
});

describe("🆔 Vérification d’identité", () => {
    test("✅ Envoi des fichiers de vérification", async () => {
        const res = await request(app)
            .post("/api/verification/upload-verification")
            .set("Authorization", `Bearer ${userToken}`)
            .attach("verification_video", Buffer.from("dummy_video"), "video.mp4")
            .attach("cni_front", Buffer.from("dummy_front"), "cni_front.jpg")
            .attach("cni_back", Buffer.from("dummy_back"), "cni_back.jpg");

        console.log("🔹 Réponse envoi de vérification :", res.body);
        expect(res.statusCode).toBe(201);
    });

    test("✅ Récupération du statut de vérification", async () => {
        const res = await request(app)
            .get("/api/verification/status")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse statut vérification :", res.body);
        expect([200, 404]).toContain(res.statusCode);
    });
});

afterAll(() => {
    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
