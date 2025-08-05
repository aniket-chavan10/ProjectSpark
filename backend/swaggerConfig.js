// swagger.js
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cricket Live Score API",
      version: "1.0.0",
      description: "API for managing cricket matches, ball events, scorecards, etc.",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./routes/*.js", "./models/*.js"], // Adjust path as needed
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
