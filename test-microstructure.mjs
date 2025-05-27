// Test the API endpoint for Microstructure filter
import fetch from 'node-fetch';

async function testMicrostructureFilter() {
  try {
    console.log('Testing Microstructure filter...');
    
    const url = 'http://localhost:3000/api/requests/manage?status=all&priority=all&capability=microstructure&type=ntr&search=&page=1&limit=20';
    console.log('URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('Number of results:', data.data?.length || 0);
      if (data.data && data.data.length > 0) {
        console.log('❌ ERROR: Should return 0 results for Microstructure!');
        data.data.forEach(req => {
          console.log(`- ${req.id}: ${req.capability}`);
        });
      } else {
        console.log('✅ CORRECT: No results for Microstructure filter');
      }
    } else {
      console.log('❌ API Error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testMicrostructureFilter();
