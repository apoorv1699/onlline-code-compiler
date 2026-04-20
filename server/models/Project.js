const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, default: '' }
});

const ProjectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  language: { type: String, required: true },
  files: [FileSchema],
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

if (process.env.MONGO_URI) {
  module.exports = mongoose.model('Project', ProjectSchema);
} else {
  module.exports = require('../localDb').Project;
}
