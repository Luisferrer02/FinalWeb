const Project = require("../models/nosql/projects");

// Lista proyectos no archivados del usuario
const getProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const projects = await Project.find({ userId, archived: false });
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

// Lista proyectos archivados del usuario
const getArchivedProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const archivedProjects = await Project.find({ userId, archived: true });
    res.status(200).json(archivedProjects);
  } catch (error) {
    console.error("Error al obtener proyectos archivados:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

// Devuelve un proyecto específico
const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project || String(project.userId) !== String(req.user._id)) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }
    res.status(200).json(project);
  } catch (error) {
    console.error("Error al obtener el proyecto:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

// Crea un nuevo proyecto
const addProject = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, clientId, description } = req.body;
    const newProject = new Project({ userId, clientId, name, description });
    const projectSaved = await newProject.save();
    res.status(200).json(projectSaved);
  } catch (error) {
    console.error("Error al crear proyecto:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

// Actualiza un proyecto
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!project)
      return res.status(404).json({ error: "Proyecto no encontrado" });
    res.status(200).json(project);
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

// Elimina (hard delete) un proyecto
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });
    if (!project)
      return res.status(404).json({ error: "Proyecto no encontrado" });
    res.status(200).json({ message: "Proyecto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar proyecto:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

// Archiva (soft delete) un proyecto
const archiveProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { archived: true },
      { new: true }
    );
    if (!project)
      return res.status(404).json({ error: "Proyecto no encontrado" });
    res.status(200).json({ message: "Proyecto archivado correctamente" });
  } catch (error) {
    console.error("Error al archivar proyecto:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

// Restaura un proyecto archivado
const restoreProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { archived: false },
      { new: true }
    );
    if (!project)
      return res.status(404).json({ error: "Proyecto no encontrado" });
    res.status(200).json({ message: "Proyecto restaurado correctamente" });
  } catch (error) {
    console.error("Error al restaurar proyecto:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

module.exports = {
  getProjects,
  getArchivedProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
};
