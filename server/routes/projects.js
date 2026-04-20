const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Project = require('../models/Project');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware to verify auth
const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token is not valid' });
  }
};

router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.id }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, language, files } = req.body;
    const project = new Project({
      owner: req.user.id,
      name: name || 'Untitled Project',
      language,
      files: files || []
    });
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, language, files } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    if (name) project.name = name;
    if (language) project.language = language;
    if (files) project.files = files;
    project.updatedAt = Date.now();
    
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Project.deleteOne({ _id: req.params.id, owner: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
