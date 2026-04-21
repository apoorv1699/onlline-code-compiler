require('dotenv').config();
const mongoose = require('mongoose');

// Standard URI that bypasses SRV lookups
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('Error: MONGO_URI is not set in the .env file');
  process.exit(1);
}

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
