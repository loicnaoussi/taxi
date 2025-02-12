const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

jest.setTimeout(30000); // ⏳ Augmenter le timeout global

let driverToken;
let vehicleId;

beforeAll(async () => {
    console.log("🔹 Suppression des anciens comptes de test...");
    await db.query("DELETE FROM vehicles WHERE driver_id IN (SELECT user_id FROM users WHERE email LIKE 'testdriver%')");
    await db.query("DELETE FROM users WHERE email LIKE 'testdriver%' OR phone_number = '0611122334'");
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
});

describe("🚗 Gestion des véhicules", () => {
    test("✅ Ajout d’un véhicule", async () => {
        const res = await request(app)
            .post("/api/vehicles/add")
            .set("Authorization", `Bearer ${driverToken}`)
            .send({
                marque: "Toyota",
                model: "Corolla",
                year: 2021,
                license_plate: "XYZ-123",
                immatriculation: "123456789",
                couleur: "Noir"
            });

        console.log("🔹 Réponse ajout véhicule :", res.body);
        expect(res.statusCode).toBe(201);
        vehicleId = res.body.vehicle_id || null;
        expect(vehicleId).not.toBeNull();
    });

    test("✅ Modification d’un véhicule", async () => {
        expect(vehicleId).toBeDefined();

        const res = await request(app)
            .put(`/api/vehicles/edit-vehicle/${vehicleId}`)
            .set("Authorization", `Bearer ${driverToken}`)
            .send({ couleur: "Rouge" });

        console.log("🔹 Réponse modification véhicule :", res.body);
        expect(res.statusCode).toBe(200);
    });

    test("✅ Suppression d’un véhicule", async () => {
        expect(vehicleId).toBeDefined();

        const res = await request(app)
            .delete(`/api/vehicles/delete-vehicle/${vehicleId}`)
            .set("Authorization", `Bearer ${driverToken}`);

        console.log("🔹 Réponse suppression véhicule :", res.body);
        expect(res.statusCode).toBe(200);
    });
});

afterAll(async () => {
    console.log("🔹 Fermeture du serveur...");
    await db.end(); // 🛑 Ferme la connexion MySQL
    server.close();
    console.log("✅ Serveur fermé !");
});
