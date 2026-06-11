require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const user = await User.findOne({ email: 'apoory@gmail.com' });
    if (!user) {
      console.log('USER_NOT_FOUND');
    } else {
      console.log('USER_FOUND');
      console.log('email:', user.email);
      console.log('username:', user.username);
      console.log('passwordHash:', user.password);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
})();
