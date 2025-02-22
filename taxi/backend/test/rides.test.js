const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

jest.setTimeout(30000); // ⏳ Timeout augmenté pour les tests

let passengerToken, driverToken, rideId;

beforeAll(async () => {
    console.log("🔹 Création ou connexion des comptes de test pour les trajets...");

    // ✅ 1️⃣ Création ou Connexion du PASSAGER
    let passengerRes = await request(app).post("/api/auth/login").send({
        identifier: "ride_user@example.com",
        password: "user123"
    });

    if (passengerRes.statusCode === 401) {
        console.log("🚨 Passager introuvable, création du compte...");
        await request(app).post("/api/auth/register").send({
            username: "ride_user",
            email: "ride_user@example.com",
            password: "user123",
            full_name: "User Ride",
            phone_number: "0622233445",
            user_type: "passenger"
        });

        passengerRes = await request(app).post("/api/auth/login").send({
            identifier: "ride_user@example.com",
            password: "user123"
        });
    }

    expect(passengerRes.statusCode).toBe(200);
    passengerToken = passengerRes.body.accessToken;
    console.log(`✅ Connexion passager réussie avec user_id ${passengerRes.body.user.user_id}`);

    // ✅ 2️⃣ Création ou Connexion du CHAUFFEUR
    let driverRes = await request(app).post("/api/auth/login").send({
        identifier: "ride_driver@example.com",
        password: "driver123"
    });

    if (driverRes.statusCode === 401) {
        console.log("🚨 Chauffeur introuvable, création du compte...");
        await request(app).post("/api/auth/register").send({
            username: "ride_driver",
            email: "ride_driver@example.com",
            password: "driver123",
            full_name: "Driver Ride",
            phone_number: "0622255566",
            user_type: "driver"
        });

        driverRes = await request(app).post("/api/auth/login").send({
            identifier: "ride_driver@example.com",
            password: "driver123"
        });
    }

    expect(driverRes.statusCode).toBe(200);
    driverToken = driverRes.body.accessToken;
    console.log(`✅ Connexion chauffeur réussie avec user_id ${driverRes.body.user.user_id}`);
});

describe("🚘 Gestion des trajets (Rides)", () => {
    jest.setTimeout(20000);

    test("✅ Création d'un trajet (Passager)", async () => {
        console.log("🔹 Création d'un trajet...");
        const res = await request(app)
            .post("/api/rides/create")
            .set("Authorization", `Bearer ${passengerToken}`)
            .send({
                pickup_location: "Paris",
                dropoff_location: "Lyon",
                fare: 75.00
            });

        console.log("🔹 Réponse création trajet :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("ride_id");

        rideId = res.body.ride_id;
        console.log(`✅ Trajet créé avec ride_id ${rideId}`);
    });

    test("✅ Acceptation d'un trajet (Chauffeur)", async () => {
        if (!rideId) {
            console.warn("⚠️ Aucun trajet disponible pour acceptation. Test ignoré.");
            return;
        }

        console.log(`🔹 Acceptation du trajet ${rideId}...`);
        const res = await request(app)
            .post(`/api/rides/accept/${rideId}`)
            .set("Authorization", `Bearer ${driverToken}`);

        console.log("🔹 Réponse acceptation trajet :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Trajet accepté avec succès !");
        console.log(`✅ Trajet ${rideId} accepté par le chauffeur`);
    });

    test("✅ Annulation d'un trajet (Passager)", async () => {
        if (!rideId) {
            console.warn("⚠️ Aucun trajet à annuler. Test ignoré.");
            return;
        }

        console.log(`🔹 Annulation du trajet ${rideId}...`);
        const res = await request(app)
            .post(`/api/rides/cancel/${rideId}`)
            .set("Authorization", `Bearer ${passengerToken}`);

        console.log("🔹 Réponse annulation trajet :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Trajet annulé avec succès.");
        console.log(`✅ Trajet ${rideId} annulé par le passager`);
    });

    test("✅ Consultation des trajets du passager", async () => {
        console.log("🔹 Récupération des trajets du passager...");
        const res = await request(app)
            .get("/api/rides/my-rides")
            .set("Authorization", `Bearer ${passengerToken}`);

        console.log("🔹 Réponse trajets du passager :", res.body);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.rides)).toBe(true);
        console.log(`✅ Le passager a ${res.body.rides.length} trajets dans son historique.`);
    });

    test("✅ Consultation des trajets du chauffeur", async () => {
        console.log("🔹 Récupération des trajets du chauffeur...");
        const res = await request(app)
            .get("/api/rides/my-rides")
            .set("Authorization", `Bearer ${driverToken}`);

        console.log("🔹 Réponse trajets du chauffeur :", res.body);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.rides)).toBe(true);
        console.log(`✅ Le chauffeur a ${res.body.rides.length} trajets dans son historique.`);
    });
});

afterAll(async () => {
    console.log("🔹 Suppression des comptes de test...");
    await db.query("DELETE FROM users WHERE email IN (?, ?)", [
        "ride_user@example.com",
        "ride_driver@example.com"
    ]);

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
