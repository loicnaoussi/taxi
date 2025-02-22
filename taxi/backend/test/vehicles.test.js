const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

jest.setTimeout(30000); // ⏳ Augmenter le timeout global

let driverToken;
let testDriverId;
let testVehicleId;

beforeAll(async () => {
    console.log("🔹 Suppression des anciens chauffeurs et véhicules de test...");
    await db.query("DELETE FROM vehicles WHERE driver_id IN (SELECT user_id FROM users WHERE email LIKE 'testdriver%')");
    await db.query("DELETE FROM users WHERE email LIKE 'testdriver%'");
    console.log("✅ Suppression terminée !");

    // ✅ Inscription du chauffeur
    const resRegister = await request(app)
        .post("/api/auth/register")
        .send({
            username: "testdriver",
            email: "testdriver@example.com",
            phone_number: "0611122334",
            password: "password123",
            full_name: "Test Driver",
            user_type: "driver"
        });

    console.log("🔹 Réponse inscription chauffeur :", resRegister.body);
    expect(resRegister.statusCode).toBe(201);

    // ✅ Connexion du chauffeur
    const resLogin = await request(app)
        .post("/api/auth/login")
        .send({
            identifier: "testdriver@example.com",
            password: "password123"
        });

    console.log("🔹 Réponse connexion chauffeur :", resLogin.body);
    expect(resLogin.statusCode).toBe(200);
    driverToken = resLogin.body.accessToken;
    testDriverId = resLogin.body.user.user_id;

    // ✅ Vérification et création du dossier `test-files/`
    const testFilesDir = path.join(__dirname, "test-files");
    if (!fs.existsSync(testFilesDir)) {
        fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // ✅ Création d'un fichier factice `test_carte_grise.jpg`
    const carteGrisePath = path.join(testFilesDir, "test_carte_grise.jpg");
    if (!fs.existsSync(carteGrisePath)) {
        fs.writeFileSync(carteGrisePath, "fake_image_content");
    }
});

describe("🚗 Gestion des véhicules", () => {
    test("✅ Ajout d’un véhicule", async () => {
        const carteGrisePath = path.join(__dirname, "test-files/test_carte_grise.jpg");

        const res = await request(app)
            .post("/api/vehicles/add")
            .set("Authorization", `Bearer ${driverToken}`)
            .field("marque", "Toyota")
            .field("model", "Corolla")
            .field("year", "2021")
            .field("license_plate", "XYZ-123")
            .field("couleur", "Noir")
            .field("immatriculation", "123456789")
            .attach("carte_grise", carteGrisePath);

        console.log("🔹 Réponse ajout véhicule :", res.body);
        expect(res.statusCode).toBe(201);
        testVehicleId = res.body.vehicle_id;
        expect(testVehicleId).toBeDefined();
    });

    test("✅ Récupérer les véhicules d'un chauffeur", async () => {
        expect(testVehicleId).toBeDefined();

        const res = await request(app)
            .get("/api/vehicles/my-vehicles")
            .set("Authorization", `Bearer ${driverToken}`);

        console.log("🔹 Réponse récupération véhicules :", res.body);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test("✅ Modifier un véhicule", async () => {
        expect(testVehicleId).toBeDefined();

        const res = await request(app)
            .put(`/api/vehicles/edit-vehicle/${testVehicleId}`)
            .set("Authorization", `Bearer ${driverToken}`)
            .send({ couleur: "Rouge" });

        console.log("🔹 Réponse modification véhicule :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Véhicule mis à jour avec succès.");
    });

    test("🚫 Essayer de modifier un véhicule inexistant (404)", async () => {
        const res = await request(app)
            .put(`/api/vehicles/edit-vehicle/9999999`)
            .set("Authorization", `Bearer ${driverToken}`)
            .send({ couleur: "Bleu" });

        console.log("🔹 Réponse modification véhicule inexistant :", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Véhicule non trouvé.");
    });

    test("✅ Supprimer un véhicule", async () => {
        expect(testVehicleId).toBeDefined();

        const res = await request(app)
            .delete(`/api/vehicles/delete-vehicle/${testVehicleId}`)
            .set("Authorization", `Bearer ${driverToken}`);

        console.log("🔹 Réponse suppression véhicule :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Véhicule supprimé avec succès.");
    });

    test("🚫 Essayer de supprimer un véhicule inexistant (404)", async () => {
        const res = await request(app)
            .delete(`/api/vehicles/delete-vehicle/9999999`)
            .set("Authorization", `Bearer ${driverToken}`);

        console.log("🔹 Réponse suppression véhicule inexistant :", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Véhicule non trouvé.");
    });
});

afterAll(async () => {
    console.log("🔹 Suppression des données de test...");
    await db.query("DELETE FROM vehicles WHERE driver_id = ?", [testDriverId]);
    await db.query("DELETE FROM users WHERE user_id = ?", [testDriverId]);

    console.log("🔹 Fermeture du serveur...");
    await db.end(); // 🛑 Ferme la connexion MySQL proprement
    server.close();
    console.log("✅ Serveur et connexion à la base de données fermés !");
});
