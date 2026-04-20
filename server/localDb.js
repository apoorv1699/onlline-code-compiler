const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Init local database
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], projects: [] }));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
const generateId = () => crypto.randomBytes(12).toString('hex');

class UserModel {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = generateId();
    if (!this.createdAt) this.createdAt = new Date();
  }
  async save() {
    const db = readDB();
    const existingIndex = db.users.findIndex(u => u._id === this._id);
    if (existingIndex >= 0) db.users[existingIndex] = this;
    else db.users.push(this);
    writeDB(db);
    return this;
  }
  static async findOne(query) {
    const db = readDB();
    if (query.$or) {
      const found = db.users.find(u => query.$or.some(cond => {
        const key = Object.keys(cond)[0];
        return u[key] === cond[key];
      }));
      return found ? new UserModel(found) : null;
    }
    const key = Object.keys(query)[0];
    const found = db.users.find(u => u[key] === query[key]);
    return found ? new UserModel(found) : null;
  }
}

class ProjectModel {
  constructor(data) {
    Object.assign(this, data);
    if (!this._id) this._id = generateId();
    if (!this.createdAt) this.createdAt = new Date();
    if (!this.updatedAt) this.updatedAt = new Date();
  }
  async save() {
    const db = readDB();
    const existingIndex = db.projects.findIndex(p => p._id === this._id);
    if (existingIndex >= 0) db.projects[existingIndex] = this;
    else db.projects.push(this);
    writeDB(db);
    return this;
  }
  static find(query) {
    const db = readDB();
    const key = Object.keys(query)[0];
    const results = db.projects.filter(p => p[key] === query[key]);
    return {
      sort: (sortObj) => {
        return Promise.resolve(results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      }
    };
  }
  static async findOne(query) {
    const db = readDB();
    const found = db.projects.find(p => p._id === query._id && p.owner === query.owner);
    return found ? new ProjectModel(found) : null;
  }
  static async deleteOne(query) {
    const db = readDB();
    const initialLen = db.projects.length;
    db.projects = db.projects.filter(p => !(p._id === query._id && p.owner === query.owner));
    writeDB(db);
    return { deletedCount: initialLen - db.projects.length };
  }
}

module.exports = { User: UserModel, Project: ProjectModel };
