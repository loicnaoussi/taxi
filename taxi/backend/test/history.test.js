const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let passengerToken, driverToken, adminToken;
let passengerId, driverId, adminId;
let testRideId;

beforeAll(async () => {
    console.log("🔹 Suppression des anciens utilisateurs et trajets de test...");

    await db.query("DELETE FROM rides WHERE passenger_id IN (SELECT user_id FROM users WHERE email LIKE 'testuser%')");
    await db.query("DELETE FROM history WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'testuser%')");
    await db.query("DELETE FROM users WHERE email LIKE 'testuser%'");

    console.log("✅ Suppression terminée !");

    async function createAndLoginUser(email, username, userType) {
        await request(app).post("/api/auth/register").send({
            username,
            email,
            password: "password123",
            phone_number: `06${Math.floor(10000000 + Math.random() * 90000000)}`,
            full_name: `${username} Test`,
            user_type: userType
        });

        const res = await request(app).post("/api/auth/login").send({
            identifier: email,
            password: "password123"
        });

        expect(res.statusCode).toBe(200);
        return { token: res.body.accessToken, userId: res.body.user.user_id };
    }

    const passenger = await createAndLoginUser("passenger_test@example.com", "passenger_test", "passenger");
    const driver = await createAndLoginUser("driver_test@example.com", "driver_test", "driver");
    const admin = await createAndLoginUser("admin_test@example.com", "admin_test", "admin");

    passengerToken = passenger.token;
    driverToken = driver.token;
    adminToken = admin.token;
    passengerId = passenger.userId;
    driverId = driver.userId;
    adminId = admin.userId;

    console.log(`✅ Utilisateur Passager: ${passengerId}, Chauffeur: ${driverId}, Admin: ${adminId}`);

    // ✅ Création d'un trajet de test
    const [rideRes] = await db.query(
        "INSERT INTO rides (passenger_id, driver_id, pickup_location, dropoff_location, status) VALUES (?, ?, ?, ?, ?)",
        [passengerId, driverId, "Point A", "Point B", "completed"]
    );

    testRideId = rideRes.insertId || null;

    if (!testRideId) {
        throw new Error("❌ Échec de l'insertion du trajet !");
    }

    console.log(`✅ Trajet de test créé avec ride_id: ${testRideId}`);
});



describe("📜 Tests des routes d'historique", () => {

    test("✅ Voir l'historique des trajets (passager ou chauffeur)", async () => {
        const res = await request(app)
            .get("/api/history/my-rides")
            .set("Authorization", `Bearer ${passengerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("total");
        expect(Array.isArray(res.body.rides)).toBe(true);
    });

    test("✅ Voir un trajet spécifique", async () => {
        console.log(`🔍 Test de récupération du trajet avec ride_id: ${testRideId}`);
    
        expect(testRideId).toBeDefined(); // ✅ Vérifie que testRideId est bien défini
    
        if (!testRideId) {
            console.log("❌ testRideId est undefined, impossible de poursuivre le test.");
            return;
        }
    
        const res = await request(app)
            .get(`/api/history/ride/${testRideId}`)
            .set("Authorization", `Bearer ${passengerToken}`);
    
        console.log(`🔹 Réponse du test trajet spécifique:`, res.body);
    
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("ride_id", testRideId);
    });
    
    

    test("🚫 Accès refusé à un trajet inexistant", async () => {
        const res = await request(app)
            .get("/api/history/ride/999999")
            .set("Authorization", `Bearer ${passengerToken}`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("message", "Trajet non trouvé ou non accessible.");
    });

    test("✅ Voir l'historique des actions d'un utilisateur", async () => {
        const res = await request(app)
            .get("/api/history/actions/my-history")
            .set("Authorization", `Bearer ${passengerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("total");
    });

    test("✅ Voir tout l'historique des actions (Admin uniquement)", async () => {
        const res = await request(app)
            .get("/api/history/actions/admin/history")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("total");
    });

    test("🚫 Accès refusé à l'historique des actions d'un autre utilisateur (non admin)", async () => {
        const res = await request(app)
            .get("/api/history/actions/admin/user/1")
            .set("Authorization", `Bearer ${passengerToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty("message", "Accès réservé aux administrateurs.");
    });

    test("✅ Voir l'historique des actions d'un utilisateur spécifique (Admin)", async () => {
        const res = await request(app)
            .get(`/api/history/actions/admin/user/${passengerId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("total");
    });
});

afterAll(async () => {
    console.log("🧹 Nettoyage et fermeture...");

    await db.query("DELETE FROM rides WHERE ride_id = ?", [testRideId]);
    await db.query("DELETE FROM users WHERE email LIKE 'testuser%'");
    await db.query("DELETE FROM history WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'testuser%')");

    await db.end();
    server.close();
    console.log("✅ Tests terminés et serveur arrêté !");
});
