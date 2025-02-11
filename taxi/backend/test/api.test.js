require("dotenv").config({ path: ".env.test" }); // Charger les variables d'environnement test

const request = require("supertest");
const { app, server } = require("../server"); // Importer l'API
const db = require("../config/db");

jest.setTimeout(30000); // Augmenter le temps d'exécution des tests

let token; // Stocke le token d'authentification
let rideId; // Stocke l'ID du trajet pour les tests

// ✅ Supprimer les utilisateurs et trajets de test avant d'exécuter les tests
beforeAll(async () => {
    try {
        // Supprimer les trajets d'abord pour éviter les erreurs de clé étrangère
        await db.query("DELETE FROM rides WHERE passenger_id IN (SELECT user_id FROM users WHERE email LIKE 'test%' OR phone_number LIKE '0612345678')");
        await db.query("DELETE FROM rides WHERE driver_id IN (SELECT user_id FROM users WHERE email LIKE 'test%' OR phone_number LIKE '0612345678')");
        
        // Ensuite, supprimer les utilisateurs de test
        await db.query("DELETE FROM users WHERE email LIKE 'test%' OR phone_number LIKE '0612345678'");
    } catch (error) {
        console.error("⚠️ Erreur lors du nettoyage des données :", error.message);
    }
});


// ✅ 1. Tester l’inscription avec un email unique
test("✅ Inscription d'un nouvel utilisateur", async () => {
    const res = await request(app)
        .post("/api/auth/register")
        .send({
            username: "testuser",
            email: "testuser@example.com",
            phone_number: "0612345678",
            password: "password123",
            full_name: "Test User",
            user_type: "passenger"
        });

    console.log("🔹 Réponse inscription :", res.body); // Ajout de log

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "Utilisateur inscrit avec succès !");
});


// ✅ 2. Connexion et récupération du token
test("✅ Connexion de l'utilisateur", async () => {
    const res = await request(app)
        .post("/api/auth/login")
        .send({
            identifier: "testuser@example.com",
            password: "password123"
        });

    console.log("🔹 Réponse connexion :", res.body); // Ajout de log

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accessToken");

    token = res.body.accessToken;
});



// ✅ 3. Créer un trajet
test("✅ Création d'un trajet", async () => {
    expect(token).toBeDefined(); // Vérifie que le token est bien récupéré avant de créer un trajet.

    const res = await request(app)
        .post("/api/rides/create")
        .set("Authorization", `Bearer ${token}`)
        .send({
            pickup_location: "Paris",
            dropoff_location: "Lyon",
            fare: 50.00
        });

    console.log("🔹 Réponse création trajet :", res.body); // Ajout de log

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("ride_id");

    rideId = res.body.ride_id; // Stocke l'ID du trajet
});


// ✅ 4. Récupérer les trajets de l'utilisateur
test("✅ Récupération des trajets de l'utilisateur", async () => {
    const res = await request(app)
        .get("/api/rides/my-rides")
        .set("Authorization", `Bearer ${token}`);

    console.log("🔹 Réponse récupération trajets :", res.body); // Ajout de log

    expect(res.statusCode).toBe(200);

    // Correction : Tester directement si c'est un tableau, quel que soit le format
    expect(Array.isArray(res.body) || Array.isArray(res.body.rides)).toBe(true);
});


// ✅ 5. Annuler un trajet
test("✅ Annulation d'un trajet", async () => {
    expect(rideId).toBeDefined(); // Vérifie que le rideId est bien défini

    const res = await request(app)
        .post(`/api/rides/cancel/${rideId}`)
        .set("Authorization", `Bearer ${token}`);

    console.log("🔹 Réponse annulation trajet :", res.body); // Ajout de log

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Trajet annulé avec succès.");
});



// ✅ 6. Vérification que le trajet est annulé
test("✅ Vérification que le trajet est annulé", async () => {
    const res = await request(app)
        .get(`/api/rides/${rideId}`)
        .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(res.body.status).toBe("canceled"); // Vérifie si le statut est bien "canceled"
});

// ✅ 7. Tester les notifications
test("✅ Envoi d'une notification", async () => {
    console.log("🔹 Token avant envoi notification :", token);

    const res = await request(app)
        .post("/api/notifications/send")
        .set("Authorization", `Bearer ${token}`)
        .send({
            user_id: 1, // S'assurer que cet utilisateur existe bien en base
            title: "Test Notification",
            message: "Ceci est un test de notification."
        });

    console.log("🔹 Réponse notification :", res.body);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "Notification envoyée avec succès !");
});


// ✅ 8. Tester la récupération des notifications
test("✅ Récupération des notifications", async () => {
    const res = await request(app)
        .get("/api/notifications/my-notifications")
        .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
});

// ✅ 9. Fermer la connexion après les tests
afterAll(async () => {
    await db.query("SET FOREIGN_KEY_CHECKS=0"); // Désactiver les contraintes pour supprimer proprement
    await db.query("DELETE FROM rides");
    await db.query("DELETE FROM users WHERE email LIKE 'test%' OR phone_number LIKE '0612345678'");
    await db.query("SET FOREIGN_KEY_CHECKS=1"); // Réactiver les contraintes
    server.close();
});

afterAll(async () => {
    await db.query("DELETE FROM rides WHERE passenger_id IN (SELECT user_id FROM users WHERE email LIKE 'test%' OR phone_number LIKE '0612345678')");
    await db.query("DELETE FROM rides WHERE driver_id IN (SELECT user_id FROM users WHERE email LIKE 'test%' OR phone_number LIKE '0612345678')");
    await db.query("DELETE FROM users WHERE email LIKE 'test%' OR phone_number LIKE '0612345678'");

    await db.end(); // ✅ Fermer la connexion proprement
    server.close();
});

