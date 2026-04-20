async function test() {
  console.log('Starting automated tests...');
  try {
    const username = 'testuser_' + Date.now();
    const email = username + '@test.com';
    
    console.log('1. Testing Auth Register...');
    const res1 = await fetch('http://localhost:5000/api/auth/register', { 
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: 'password123' })
    });
    const data1 = await res1.json();
    if (!res1.ok) throw new Error(data1.error);
    console.log('   Success! Token received.');
    const token = data1.token;
    
    console.log('2. Testing Project Saving...');
    const res2 = await fetch('http://localhost:5000/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: 'Test Project', language: 'javascript', files: [{name: 'index.js', content: 'console.log("hello")'}] })
    });
    const data2 = await res2.json();
    if (!res2.ok) throw new Error(data2.error);
    console.log('   Success! Project ID:', data2._id);
    
    console.log('3. Testing Code Execution...');
    const res3 = await fetch('http://localhost:5000/api/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'javascript', files: [{name: 'index.js', content: 'console.log("EXECUTION SUCCESS");'}], input: '' })
    });
    const data3 = await res3.json();
    if (!res3.ok) throw new Error(data3.error);
    console.log('   Output:', data3.output);
    
    console.log('All backend tests passed perfectly!');
  } catch (err) {
    console.error('TEST FAILED:', err.message);
  }
}
test();
