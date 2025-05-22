// src/db-init.js
const initDB = require("./db");

initDB()
  .then(db => {
    console.log("Base SQLite initialisée en mode WAL");
    process.exit(0);
  })
  .catch(err => {
    console.error("Erreur d'initialisation de la base :", err);
    process.exit(1);
  });