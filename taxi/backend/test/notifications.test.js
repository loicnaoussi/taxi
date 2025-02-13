const request = require("supertest");
const { app, server } = require("../server");

let adminToken, userToken, userId;

beforeAll(async () => {
    console.log("🔹 Vérification ou création des comptes utilisateur et admin pour les tests de notifications...");

    // ✅ Connexion ou création du compte Admin
    let adminRes = await request(app).post("/api/auth/login").send({
        identifier: "admin_notifications@example.com",
        password: "admin123"
    });

    if (adminRes.statusCode === 401) {
        console.log("🚨 Admin introuvable, création du compte admin...");
        await request(app).post("/api/auth/register").send({
            username: "admin_notifications",
            email: "admin_notifications@example.com",
            password: "admin123",
            full_name: "Admin Notifications Test",
            phone_number: "0611111222",
            user_type: "admin"
        });

        // 🟢 Reconnexion après création
        adminRes = await request(app).post("/api/auth/login").send({
            identifier: "admin_notifications@example.com",
            password: "admin123"
        });
    }

    expect(adminRes.statusCode).toBe(200);
    adminToken = adminRes.body.accessToken;
    console.log("✅ Connexion admin réussie !");

    // ✅ Connexion ou création du compte Passager
    let userRes = await request(app).post("/api/auth/login").send({
        identifier: "passenger_notifications@example.com",
        password: "pass123"
    });

    if (userRes.statusCode === 401) {
        console.log("🚨 Utilisateur introuvable, création du compte passager...");
        await request(app).post("/api/auth/register").send({
            username: "passenger_notifications",
            email: "passenger_notifications@example.com",
            password: "pass123",
            full_name: "Passenger Notifications",
            phone_number: "0623456789",
            user_type: "passenger"
        });

        // 🟢 Reconnexion après création
        userRes = await request(app).post("/api/auth/login").send({
            identifier: "passenger_notifications@example.com",
            password: "pass123"
        });
    }

    expect(userRes.statusCode).toBe(200);
    userToken = userRes.body.accessToken;
    userId = userRes.body.user.user_id; // ✅ Récupération de l'ID de l'utilisateur
    console.log("✅ Connexion utilisateur réussie !");
});

describe("📩 Notifications en temps réel", () => {
    jest.setTimeout(15000); // ⏳ Augmente le timeout pour éviter les timeout prématurés

    test("✅ Envoi d'une notification (Admin → Utilisateur)", async () => {
        console.log("🔹 Envoi d'une notification depuis l'admin...");
        const res = await request(app)
            .post("/api/notifications/send")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                user_id: userId, // ✅ Utiliser l'ID de l'utilisateur
                title: "Nouvelle alerte",
                message: "Votre trajet est confirmé !"
            });

        console.log("🔹 Réponse envoi notification :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("message", "Notification envoyée avec succès !");
    });

    test("✅ Récupération des notifications (Utilisateur)", async () => {
        console.log("🔹 Récupération des notifications...");
        const res = await request(app)
            .get("/api/notifications/my-notifications")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Notifications récupérées :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("notifications");
        expect(Array.isArray(res.body.notifications)).toBe(true);
        expect(res.body.notifications.length).toBeGreaterThan(0);
    });
});

afterAll(async () => {
    console.log("🔹 Suppression des comptes de test...");
    await request(app).delete("/api/users/delete-test-account").set("Authorization", `Bearer ${adminToken}`);

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
