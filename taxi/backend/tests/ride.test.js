const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

jest.setTimeout(30000);

let token;
let driverToken;
let rideId;

// 🔹 Avant les tests, connexion et création d'un trajet
beforeAll(async () => {
    // 🔥 Connexion avec un passager
    const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "passenger@example.com", password: "password123" });

    console.log("📨 Réponse du serveur (Login Passager) :", res.body);
    if (!res.body.token) throw new Error("❌ Échec de connexion !");
    token = res.body.token;
    
    // 🔥 Création d’un trajet
    const rideRes = await request(app)
        .post("/api/rides/create")
        .set("Authorization", `Bearer ${token}`)
        .send({ pickup_location: "Paris", dropoff_location: "Lyon", fare: 45.50 });

    console.log("📨 Réponse du serveur (Création trajet) :", rideRes.body);
    if (rideRes.statusCode !== 201) throw new Error("❌ Échec de création du trajet !");
    rideId = rideRes.body.ride_id;

    // 🔥 Connexion en tant que chauffeur
    const driverRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "driver@example.com", password: "password123" });

    console.log("📨 Réponse du serveur (Login Chauffeur) :", driverRes.body);
    if (!driverRes.body.token) throw new Error("❌ Échec de connexion chauffeur !");
    driverToken = driverRes.body.token;
});

// 🔹 Modification d’un trajet avant acceptation
it("✅ Devrait permettre à un passager de modifier son trajet avant acceptation", async () => {
    const res = await request(app)
        .post(`/api/rides/update/${rideId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "in_progress" });

    console.log("📨 Réponse du serveur (Modification trajet) :", res.body);
    expect(res.statusCode).toBe(200);
});

// 🔹 Annulation d’un trajet après acceptation (Autorisé ✅)
it("✅ Devrait permettre l’annulation après acceptation", async () => {
    await request(app)
        .post(`/api/rides/accept/${rideId}`)
        .set("Authorization", `Bearer ${driverToken}`);

    const res = await request(app)
        .post(`/api/rides/cancel/${rideId}`)
        .set("Authorization", `Bearer ${token}`);

    console.log("📨 Réponse du serveur (Annulation après acceptation) :", res.body);
    expect(res.statusCode).toBe(200); // ✅ Maintenant autorisé
});

// 🔹 Annulation d’un trajet déjà complété (Toujours interdit 🚫)
it("❌ Devrait refuser l’annulation d’un trajet terminé", async () => {
    await request(app)
        .post(`/api/rides/update/${rideId}`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ status: "completed" });

    const res = await request(app)
        .post(`/api/rides/cancel/${rideId}`)
        .set("Authorization", `Bearer ${token}`);

    console.log("📨 Réponse du serveur (Annulation trajet terminé) :", res.body);
    expect(res.statusCode).toBe(403); // 🚫 Interdit
});

// 🔹 Acceptation d’un trajet annulé (Toujours interdit 🚫)
it("❌ Devrait refuser l’acceptation d’un trajet annulé", async () => {
    await request(app)
        .post(`/api/rides/cancel/${rideId}`)
        .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
        .post(`/api/rides/accept/${rideId}`)
        .set("Authorization", `Bearer ${driverToken}`);

    console.log("📨 Réponse du serveur (Acceptation trajet annulé) :", res.body);
    expect(res.statusCode).toBe(400); // 🚫 Déjà annulé
});

// 🔹 Vérification finale des statuts avec une condition
afterAll(async () => {
    const res = await request(app)
        .get(`/api/rides/${rideId}`)
        .set("Authorization", `Bearer ${token}`);

    console.log("📨 Statut final du trajet :", res.body.status);
    expect(res.statusCode).toBe(200);

    // 🚀 Vérification du bon statut final
    if (res.body.status === "canceled") {
        console.log("✅ Le trajet a bien été annulé.");
    } else if (res.body.status === "completed") {
        console.log("⚠️ Le trajet a été terminé au lieu d’être annulé.");
    }

    await db.end();
    server.close();
});
