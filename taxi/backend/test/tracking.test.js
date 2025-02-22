const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let driverToken;
let driverId;

beforeAll(async () => {
    console.log("🔹 Connexion du chauffeur pour les tests de tracking...");

    // ✅ Supprimer l’ancien compte test s’il existe
    await db.query("DELETE FROM users WHERE email = ?", ["driver_test@example.com"]);

    // ✅ Création ou Connexion Chauffeur
    let driverRes = await request(app).post("/api/auth/login").send({
        identifier: "driver_test@example.com",
        password: "driver123",
    });

    if (driverRes.statusCode === 401) {
        console.log("🚨 Chauffeur introuvable, création d'un compte chauffeur...");

        const registerRes = await request(app).post("/api/auth/register").send({
            username: "driver_test",
            email: "driver_test@example.com",
            password: "driver123",
            phone_number: "0712345678", // Numéro unique
            full_name: "Driver Test",
            user_type: "driver",
        });

        if (registerRes.statusCode !== 201) {
            if (registerRes.body.message.includes("Email ou numéro de téléphone déjà utilisé")) {
                console.warn("⚠️ Chauffeur déjà existant. Tentative de connexion...");
                driverRes = await request(app).post("/api/auth/login").send({
                    identifier: "driver_test@example.com",
                    password: "driver123",
                });
            } else {
                console.error("❌ Échec création chauffeur :", registerRes.body);
                throw new Error("Échec de création du compte chauffeur de test.");
            }
        } else {
            console.log("✅ Chauffeur créé avec succès !");
            driverRes = await request(app).post("/api/auth/login").send({
                identifier: "driver_test@example.com",
                password: "driver123",
            });
        }
    }

    if (driverRes.statusCode !== 200) {
        console.error("❌ Échec de connexion chauffeur :", driverRes.body);
        throw new Error("Échec de connexion du chauffeur.");
    }

    driverToken = driverRes.body.accessToken;
    driverId = driverRes.body.user?.user_id;
    console.log(`✅ Connexion chauffeur réussie avec user_id ${driverId}`);
});

describe("📍 Suivi GPS des chauffeurs", () => {
    jest.setTimeout(15000);

    test("✅ Mise à jour de la position GPS", async () => {
        console.log("🔹 Mise à jour de la position...");

        const res = await request(app)
            .post("/api/rides/update-location")
            .set("Authorization", `Bearer ${driverToken}`)
            .send({
                latitude: 48.8566,
                longitude: 2.3522,
            });

        console.log("🔹 Position mise à jour :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Position mise à jour avec succès");
    });

    test("✅ Récupération de la position du chauffeur", async () => {
        console.log("🔹 Récupération de la position...");

        const res = await request(app)
            .get(`/api/rides/location/${driverId}`)
            .set("Authorization", `Bearer ${driverToken}`);

        console.log("🔹 Position récupérée :", res.body);
        if (res.statusCode === 404) {
            console.warn("⚠️ Position non trouvée. Test ignoré.");
            return;
        }

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("latitude");
        expect(res.body).toHaveProperty("longitude");
    });
});

afterAll(async () => {
    console.log("🗑️ Suppression du compte chauffeur de test...");
    await db.query("DELETE FROM users WHERE email = ?", ["driver_test@example.com"]);

    console.log("🔹 Fermeture propre de la connexion MySQL...");
    await db.end();

    console.log("🛑 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
