//routes/projects.js
const express = require("express");
const router = express.Router();

// Middlewares
const authMiddleware = require("../middleware/session");

// Controladores de proyectos
const {
  getProjects,
  getArchivedProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject
} = require("../controllers/projects");

// Validadores
const {
  validatorCreateProject,
  validatorProjectId,
  validatorUpdateProject
} = require("../validators/projects");

// GET /api/project – Obtiene proyectos no archivados
router.get("/", authMiddleware, getProjects);

// GET /api/project/archive – Obtiene proyectos archivados
router.get("/archive", authMiddleware, getArchivedProjects);

// GET /api/project/:id – Obtiene un proyecto en concreto
router.get("/:id", authMiddleware, validatorProjectId, getProject);

// POST /api/project – Crea un proyecto
router.post("/", authMiddleware, validatorCreateProject, addProject);

// PUT /api/project/:id – Actualiza un proyecto
router.put("/:id", authMiddleware, validatorUpdateProject, updateProject);

// DELETE /api/project/:id – Elimina (hard delete) un proyecto
router.delete("/:id", authMiddleware, validatorProjectId, deleteProject);

// PATCH /api/project/archive/:id – Archiva (soft delete) un proyecto
router.patch("/archive/:id", authMiddleware, validatorProjectId, archiveProject);

// PATCH /api/project/restore/:id – Restaura un proyecto archivado
router.patch("/restore/:id", authMiddleware, validatorProjectId, restoreProject);

module.exports = router;
