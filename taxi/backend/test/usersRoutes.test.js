const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

jest.setTimeout(30000);

let userToken;
let testUserId;

let token; // ✅ Déclare `token` au niveau global pour qu'il soit accessible dans tous les tests

beforeAll(async () => {
    console.log("🔹 Suppression des anciens utilisateurs de test...");
    await db.query("DELETE FROM users WHERE email LIKE 'testuser%' OR phone_number = '0612345678'");
    console.log("✅ Suppression terminée !");

    // ✅ Inscription d'un utilisateur
    await request(app)
        .post("/api/auth/register")
        .send({
            username: "testuser",
            email: "testuser@example.com",
            phone_number: "0612345678",
            password: "password123",
            full_name: "Test User",
            user_type: "passenger"
        });

    // ✅ Connexion de l'utilisateur
    const resLogin = await request(app)
        .post("/api/auth/login")
        .send({
            identifier: "testuser@example.com",
            password: "password123"
        });

    console.log("🔹 Réponse connexion :", resLogin.body);

    expect(resLogin.statusCode).toBe(200);
    expect(resLogin.body).toHaveProperty("accessToken");

    token = resLogin.body.accessToken; // ✅ Stocke le token pour les tests suivants
    expect(token).toBeDefined();
});


describe("👤 Tests des utilisateurs (Users)", () => {

    test("✅ Inscription d'un utilisateur", async () => {
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

        console.log("🔹 Réponse inscription :", res.body);
        expect([201, 400]).toContain(res.statusCode); // 201 si créé, 400 si déjà existant
    });

    test("✅ Connexion de l'utilisateur", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                identifier: "testuser@example.com",
                password: "password123"
            });

        console.log("🔹 Réponse connexion :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("accessToken");

        userToken = res.body.accessToken;
        testUserId = res.body.user.user_id;
        expect(userToken).toBeDefined();
    });

    test("✅ Récupérer les informations du profil", async () => {
        const res = await request(app)
            .get("/api/users/profile")
            .set("Authorization", `Bearer ${userToken}`);

        console.log("🔹 Réponse récupération profil :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("user_id", testUserId);
        expect(res.body).toHaveProperty("email", "testuser@example.com");
        expect(res.body).toHaveProperty("full_name", "Test User");
    });

    test("✅ Mettre à jour les informations utilisateur", async () => {
        const res = await request(app)
            .put("/api/users/update")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                username: "testuserUpdated",
                full_name: "Test User Updated"
            });

        console.log("🔹 Réponse mise à jour profil :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Profil mis à jour avec succès !");
    });

    test("🚫 Mettre à jour un profil avec des données invalides (400)", async () => {
        const res = await request(app)
            .put("/api/users/update")
            .set("Authorization", `Bearer ${userToken}`)
            .send({});

        console.log("🔹 Réponse mise à jour vide :", res.body);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message", "Aucune donnée à mettre à jour.");
    });

    test("✅ Mettre à jour la photo de profil", async () => {
        const imagePath = path.join(__dirname, "test_image.jpg");

        if (!fs.existsSync(imagePath)) {
            fs.writeFileSync(imagePath, "test image content");
        }

        const res = await request(app)
            .post("/api/users/upload-photo")
            .set("Authorization", `Bearer ${userToken}`)
            .attach("profile_image", imagePath);

        console.log("🔹 Réponse mise à jour photo :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Photo de profil mise à jour avec succès !");
        expect(res.body).toHaveProperty("profile_image_url");

        fs.unlinkSync(imagePath); // 🔥 Supprime le fichier de test après l'upload
    });

    test("🚫 Envoyer un fichier non image (400)", async () => {
        expect(token).toBeDefined(); // ✅ Vérifie que `token` est bien défini
    
        const res = await request(app)
            .post("/api/users/upload-photo")
            .set("Authorization", `Bearer ${token}`)
            .attach("profile_image", "test-files/test.txt"); // 📌 Ajoute un vrai fichier texte ici
    
        console.log("🔹 Réponse upload fichier non image :", res.body);
    
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message", "Seuls les fichiers images sont autorisés !");
    });
    
    

});

afterAll(async () => {
    try {
        console.log("🔹 Suppression des utilisateurs de test...");
        await db.query("DELETE FROM users WHERE email = 'testuser@example.com'");

        console.log("🔹 Fermeture propre de la connexion MySQL...");
        await db.end();

        console.log("🔹 Fermeture du serveur...");
        server.close();
        console.log("✅ Serveur fermé !");
    } catch (error) {
        console.error("⚠️ Erreur lors de la fermeture du serveur :", error.message);
    }
});
