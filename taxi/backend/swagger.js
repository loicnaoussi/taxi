// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// 📝 Options pour Swagger JSDoc
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Taxi Project API',
      version: '1.0.0',
      description: 'Documentation automatique de l’API Taxi Project',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Serveur Local',
      },
    ],
  },
  // 🛑 Parcourir tous les fichiers routes automatiquement
  apis: ['./routes/*.js'], // Assurez-vous que vos routes sont dans /routes
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
