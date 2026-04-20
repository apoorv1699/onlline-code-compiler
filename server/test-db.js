require('dotenv').config();
const mongoose = require('mongoose');

// Standard URI that bypasses SRV lookups
const uri = 'mongodb://admin:Apoorv8806@ac-wkmdyde-shard-00-00.ugwal4w.mongodb.net:27017,ac-wkmdyde-shard-00-01.ugwal4w.mongodb.net:27017,ac-wkmdyde-shard-00-02.ugwal4w.mongodb.net:27017/compiler?ssl=true&replicaSet=atlas-wkmdyde-shard-0&authSource=admin&retryWrites=true&w=majority';
console.log('Attempting standard URI connection...');

mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });
