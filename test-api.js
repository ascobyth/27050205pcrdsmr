// Test API endpoint directly
const testAPI = async () => {
  try {
    console.log('Testing API with Microstructure filter...');
    
    const response = await fetch('/api/requests/manage?status=all&priority=all&capability=microstructure&type=ntr&search=&page=1&limit=20');
    const data = await response.json();
    
    console.log('Response:', data);
    console.log('Number of results:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('ERROR: Should return 0 results for Microstructure!');
      console.log('Results:', data.data.map(r => ({ id: r.id, capability: r.capability })));
    } else {
      console.log('✅ Correct: No results for Microstructure filter');
    }
    
  } catch (error) {
    console.error('API Error:', error);
  }
};

// Run test
testAPI();
