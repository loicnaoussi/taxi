const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let userToken;
let testUserId;
let rideId;
let reviewId;

beforeAll(async () => {
    console.log("🔹 Connexion ou création d'un utilisateur de test...");

    // ✅ Vérifier et supprimer les utilisateurs et trajets de test existants
    await db.query("DELETE FROM reviews WHERE reviewer_id IN (SELECT user_id FROM users WHERE email LIKE 'testuser%')");
    await db.query("DELETE FROM rides WHERE passenger_id IN (SELECT user_id FROM users WHERE email LIKE 'testuser%')");
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

    // ✅ Création d'un trajet de test
    const rideRes = await db.query(
        "INSERT INTO rides (passenger_id, pickup_location, dropoff_location, status) VALUES (?, ?, ?, ?)",
        [testUserId, "Point A", "Point B", "completed"]
    );

    rideId = rideRes[0].insertId;
    console.log(`✅ Trajet de test créé avec ride_id: ${rideId}`);
});

describe("⭐ Tests des avis (reviews)", () => {
    
    test("✅ Ajouter un avis sur un trajet", async () => {
        const res = await request(app)
            .post("/api/reviews/add")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                ride_id: rideId,
                rating: 5,
                comment: "Super trajet, chauffeur très sympa !"
            });

        console.log("🔹 Réponse ajout avis :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("message", "Avis ajouté avec succès !");

        // ✅ Récupérer l'ID de l'avis ajouté
        const [review] = await db.query("SELECT review_id FROM reviews WHERE ride_id = ? AND reviewer_id = ?", [rideId, testUserId]);
        expect(review.length).toBe(1);
        reviewId = review[0].review_id;
        console.log(`✅ Avis ajouté avec review_id: ${reviewId}`);
    });

    test("✅ Voir les avis reçus par l'utilisateur", async () => {
        const res = await request(app)
            .get("/api/reviews/my-reviews")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse récupération avis :", res.body);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test("🚫 Ajouter un avis sans ride_id (erreur 400)", async () => {
        const res = await request(app)
            .post("/api/reviews/add")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                rating: 5,
                comment: "Trajet agréable."
            });

        console.log("🔹 Réponse ajout avis sans ride_id :", res.body);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message", "Le trajet et une note entre 1 et 5 sont requis.");
    });

    test("🚫 Ajouter un avis avec une note invalide (erreur 400)", async () => {
        const res = await request(app)
            .post("/api/reviews/add")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                ride_id: rideId,
                rating: 10, // ✅ Note invalide (hors 1-5)
                comment: "Trajet parfait !"
            });

        console.log("🔹 Réponse ajout avis avec note invalide :", res.body);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message", "Le trajet et une note entre 1 et 5 sont requis.");
    });

    test("✅ Supprimer un avis existant", async () => {
        expect(reviewId).toBeDefined();

        const res = await request(app)
            .delete(`/api/reviews/delete/${reviewId}`)
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse suppression avis :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Avis supprimé avec succès.");

        // ✅ Vérification que l'avis est bien supprimé
        const [check] = await db.query("SELECT * FROM reviews WHERE review_id = ?", [reviewId]);
        expect(check.length).toBe(0);
    });

    test("🚫 Supprimer un avis inexistant (erreur 404)", async () => {
        const res = await request(app)
            .delete("/api/reviews/delete/9999999") // ✅ ID inexistant
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse suppression avis inexistant :", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("message", "Avis non trouvé.");
    });

});

afterAll(async () => {
    console.log("🔹 Suppression des données de test...");
    await db.query("DELETE FROM reviews WHERE reviewer_id = ?", [testUserId]);
    await db.query("DELETE FROM rides WHERE passenger_id = ?", [testUserId]);
    await db.query("DELETE FROM users WHERE email = ?", ["testuser@example.com"]);

    console.log("🔹 Fermeture propre de la connexion MySQL...");
    await db.end();

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
