# Instructions to change status back to 'Pending Receive' after server restart

## Files to update after restarting development server:

### 1. API Files - Change back to correct status:

**File: /app/api/requests/submit-request/route.js**
- Line ~280: Change `sampleStatus: 'submitted'` to `sampleStatus: 'Pending Receive'`

**File: /app/api/requests/submit-ntr/route.js**  
- Line ~45: Change `requestStatus: 'submitted'` to `requestStatus: 'Pending Receive Sample'`
- Line ~85: Change `sampleStatus: 'submitted'` to `sampleStatus: 'Pending Receive'`

**File: /app/api/requests/submit/route.js**
- Line ~65: Change `requestStatus: 'submitted'` to `requestStatus: 'Pending Receive Sample'`  
- Line ~175: Change `sampleStatus: 'submitted'` to `sampleStatus: 'Pending Receive'`

### 2. Frontend File:

**File: /app/request/new/ntr/summary/page.tsx**
- Line ~215: Change `requestStatus: "submitted"` to `requestStatus: "Pending Receive"`

## Command to restart server:
```bash
# Stop server (Ctrl+C)
rmdir /S /Q .next
npm cache clean --force
npm run dev
```

## Models are already updated:
- RequestList.js: 'Pending Receive Sample' added to enum
- TestingSampleList.js: 'Pending Receive' added to enum
