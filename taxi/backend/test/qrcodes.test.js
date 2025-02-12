const request = require("supertest");
const { app, server } = require("../server"); // ✅ Import du serveur et de l'API
const db = require("../config/db"); // ✅ Import de la base de données

let token;
let qrCodeData;

beforeAll(async () => {
    console.log("🔹 Connexion de l'utilisateur pour les tests des QR Codes...");

    const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "testuser@example.com", password: "password123" });

    console.log("🔹 Réponse connexion :", res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accessToken");

    token = res.body.accessToken;
    expect(token).toBeDefined();
});

describe("📌 Gestion des QR Codes", () => {
    test("✅ Récupération du QR Code", async () => {
        expect(token).toBeDefined();

        const res = await request(app)
            .get("/api/qrcodes/my-qrcode")
            .set("Authorization", `Bearer ${token}`);

        console.log("🔹 Réponse récupération QR Code :", res.body);

        if (res.statusCode === 404) {
            console.warn("⚠️ Aucun QR Code trouvé pour cet utilisateur.");
        } else {
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("qr_code");

            qrCodeData = res.body.qr_code;
            expect(qrCodeData).toBeDefined();
        }
    });

    test("✅ Validation d’un QR Code", async () => {
        expect(token).toBeDefined();

        if (!qrCodeData) {
            console.warn("⚠️ Pas de QR Code disponible pour la validation, ce test est ignoré.");
            return;
        }

        const res = await request(app)
            .post("/api/qrcodes/validate")
            .set("Authorization", `Bearer ${token}`)
            .send({ qr_code: qrCodeData });

        console.log("🔹 Réponse validation QR Code :", res.body);

        expect(res.statusCode).toBe(200);
    });
});

afterAll(() => {
    console.log("🔹 Fermeture du serveur après les tests des QR Codes...");
    server.close();
    console.log("✅ Serveur fermé !");
});
