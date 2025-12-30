const { config } = require('dotenv');
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
  // List tables
  const res = await fetch(url + '/rest/v1/', {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });
  const data = await res.json();
  const paths = Object.keys(data.paths || {}).filter(p => p !== '/');
  console.log('Available tables/views:');
  paths.forEach(p => console.log('  ', p));

  // Try to access generations table directly
  console.log('\nTrying to access generations...');
  const res2 = await fetch(url + '/rest/v1/generations?select=id,image_url&limit=5', {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=representation'
    }
  });
  console.log('Status:', res2.status);
  const data2 = await res2.text();
  console.log('Response:', data2.substring(0, 200));
}

test().catch(console.error);
