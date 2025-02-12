const request = require("supertest");
const { app, server } = require("../server"); // ✅ Import du serveur et de l'API
const db = require("../config/db"); // ✅ Import de la base de données


let token;
let contactId;

beforeAll(async () => {
    const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "testuser@example.com", password: "password123" });

    token = res.body.accessToken;
});

describe("🚨 Contacts d’urgence", () => {
    test("✅ Ajout d’un contact d’urgence", async () => {
        const res = await request(app)
            .post("/api/emergency/add")
            .set("Authorization", `Bearer ${token}`)
            .send({ contact_name: "Contact Test", contact_phone: "0611122334" });

        expect(res.statusCode).toBe(201);
        contactId = res.body.contact_id;
    });

    test("✅ Récupération des contacts d’urgence", async () => {
        const res = await request(app)
            .get("/api/emergency/my-contacts")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
    });

    test("✅ Suppression d’un contact", async () => {
        const res = await request(app)
            .delete(`/api/emergency/delete/${contactId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
    });
});

afterAll(async () => {
    console.log("🔹 Fermeture du serveur...");
    await server.close();
    console.log("✅ Serveur fermé !");
});

