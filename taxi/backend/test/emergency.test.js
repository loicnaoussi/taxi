const request = require("supertest");
const { app, server } = require("../server"); // ✅ Import du serveur et de l'API
const db = require("../config/db"); // ✅ Import de la base de données

let token;
let contactId;

beforeAll(async () => {
    console.log("🔹 Vérification ou création d'un compte utilisateur pour les tests de contacts d’urgence...");

    // ✅ Connexion ou création d'un compte utilisateur de test
    let userRes = await request(app).post("/api/auth/login").send({
        identifier: "testuser_emergency@example.com",
        password: "password123"
    });

    if (userRes.statusCode === 401) {
        console.log("🚨 Utilisateur introuvable, création du compte de test...");

        const registerRes = await request(app).post("/api/auth/register").send({
            username: "testuser_emergency",
            email: "testuser_emergency@example.com",
            password: "password123",
            full_name: "User Emergency Test",
            phone_number: "0612345679",
            user_type: "passenger"
        });

        if (registerRes.statusCode !== 201) {
            console.error("❌ Échec de la création du compte utilisateur :", registerRes.body);
            throw new Error("Échec de la création du compte utilisateur de test");
        }

        // 🟢 Reconnexion après création
        userRes = await request(app).post("/api/auth/login").send({
            identifier: "testuser_emergency@example.com",
            password: "password123"
        });
    }

    expect(userRes.statusCode).toBe(200);
    token = userRes.body.accessToken;
    console.log("✅ Connexion utilisateur réussie !");
});

describe("🚨 Contacts d’urgence", () => {
    test("✅ Ajout d’un contact d’urgence", async () => {
        const res = await request(app)
            .post("/api/emergency/add")
            .set("Authorization", `Bearer ${token}`)
            .send({
                contact_name: "Contact Test",
                contact_phone: "0611122334"
            });

        console.log("🔹 Réponse ajout contact :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("contact_id");

        contactId = res.body.contact_id; // Enregistrer l'ID pour le test de suppression
        console.log(`✅ Contact ajouté avec succès, ID: ${contactId}`);
    });

    test("✅ Récupération des contacts d’urgence", async () => {
        const res = await request(app)
            .get("/api/emergency/my-contacts")
            .set("Authorization", `Bearer ${token}`);

        console.log("🔹 Contacts récupérés :", res.body);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("✅ Suppression d’un contact", async () => {
        const res = await request(app)
            .delete(`/api/emergency/delete/${contactId}`)
            .set("Authorization", `Bearer ${token}`);

        console.log(`🔹 Réponse suppression contact (ID: ${contactId}):`, res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Contact d'urgence supprimé avec succès.");
    });
});

afterAll(async () => {
    console.log("🔹 Fermeture du serveur...");
    await server.close();
    console.log("✅ Serveur fermé !");
});
