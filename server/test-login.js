const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'apoory@gmail.com',
      password: 'yourpassword'
    });
    console.log('SUCCESS', res.data);
  } catch (err) {
    if (err.response) {
      console.error('STATUS', err.response.status);
      console.error('DATA', err.response.data);
    } else {
      console.error('ERROR', err.message);
    }
  }
})();
