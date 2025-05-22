// src/routes/todos.js
const express = require("express");
const cache = require("../middleware/cache");
const idempotency = require("../middleware/idempotency");
const validate = require("../middleware/validate");
const schemas = require("../schemas/todo.schema");
const todoQueue = require("../services/queue.service");

module.exports = (db) => {
  const router = express.Router();

  // Création d'un todo (avec idempotence)
  router.post(
    "/",
    idempotency,
    validate(schemas.create),
    async (req, res, next) => {
      try {
        const { title } = req.body;
        const result = await db.run(
          `INSERT INTO todos (title) VALUES (?)`,
          [title]
        );
        const todo = await db.get(
          `SELECT * FROM todos WHERE id = ?`,
          [result.lastID]
        );
        await todoQueue.add('newTodo', { todo });
        res.status(201).json(todo);
      } catch (err) {
        next(err);
      }
    }
  );

  // Lecture de tous les todos (avec cache)
  router.get(
    "/",
    cache,
    async (_req, res, next) => {
      try {
        const todos = await db.all(
          `SELECT * FROM todos ORDER BY created_at DESC`
        );
        res.json(todos);
      } catch (err) {
        next(err);
      }
    }
  );



  // Mise à jour du flag done
  router.patch(
    "/:id/done",
    validate(schemas.updateDone),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { done } = req.body;
        await db.run(
          `UPDATE todos SET done = ? WHERE id = ?`,
          [done ? 1 : 0, id]
        );
        const todo = await db.get(
          `SELECT * FROM todos WHERE id = ?`,
          [id]
        );
        res.json(todo);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};
