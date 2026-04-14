require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { executeCode } = require('./dockerService');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://root:Apoorv8806@library-management-syst.ugwal4w.mongodb.net/?appName=Library-Management-System';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Code execution route
app.post('/api/execute', async (req, res) => {
  const { language, code, input } = req.body;
  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  try {
    const output = await executeCode(language, code, input);
    res.json({ output });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error executing code' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
