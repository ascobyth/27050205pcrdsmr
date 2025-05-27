// Temporary fix: Use existing enum values
// Place this in /app/api/requests/submit-request/route.js

// For RequestList - use existing 'submitted' temporarily
requestStatus: 'submitted', // Will be updated after server restart

// For TestingSampleList - use existing 'submitted' temporarily  
sampleStatus: 'submitted', // Will be updated after server restart

// After restart, change back to:
// requestStatus: 'Pending Receive Sample',
// sampleStatus: 'Pending Receive',
