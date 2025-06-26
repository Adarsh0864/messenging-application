# Firebase Storage CORS Fix Instructions

## Problem
You're experiencing a CORS (Cross-Origin Resource Sharing) error when trying to upload images/videos to Firebase Storage from your app deployed on Vercel. This happens because Firebase Storage needs to be configured to accept requests from your domain.

## Solution

### Step 1: Install Google Cloud SDK (if not already installed)

#### For macOS:
```bash
brew install google-cloud-sdk
```

#### For Windows:
Download and install from: https://cloud.google.com/sdk/docs/install

#### For Linux:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 2: Authenticate with Google Cloud
```bash
gcloud auth login
```

### Step 3: Set your Firebase project
```bash
gcloud config set project messenging-app-b43da
```

### Step 4: Deploy CORS Configuration

#### For macOS/Linux:
```bash
./deploy-cors.sh
```

#### For Windows:
```cmd
deploy-cors.bat
```

#### Or manually run:
```bash
gsutil cors set cors.json gs://messenging-app-b43da.appspot.com
```

### Step 5: Verify CORS Configuration
To check if CORS is properly configured:
```bash
gsutil cors get gs://messenging-app-b43da.appspot.com
```

## What This Does
The CORS configuration allows your Firebase Storage bucket to accept requests from:
- `https://messenger-sigma-two.vercel.app` (your production domain)
- `http://localhost:3000` (local development)
- `http://localhost:3001` (alternative local port)

## Additional Considerations

### 1. Ensure Authentication is Working
Make sure users are properly authenticated before attempting file uploads. Check the browser console for authentication errors.

### 2. Check Storage Rules
Your storage rules require authentication. Ensure the user is signed in:
```javascript
// In your upload component
import { auth } from '@/lib/firebase';

// Check if user is authenticated
if (!auth.currentUser) {
  console.error('User must be authenticated to upload files');
  return;
}
```

### 3. Update Vercel Domain (if changed)
If you deploy to a different domain, update the `cors.json` file and redeploy:
```json
{
  "origin": ["https://your-new-domain.vercel.app", "http://localhost:3000"],
  ...
}
```

### 4. Clear Browser Cache
After deploying CORS configuration, clear your browser cache or try in an incognito window.

## Troubleshooting

If you still encounter issues:

1. **Check browser console** for detailed error messages
2. **Verify Firebase configuration** in `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=messenging-app-b43da.appspot.com
   ```
3. **Check network tab** in browser DevTools to see the exact request/response
4. **Test with a simple upload** to isolate the issue:
   ```javascript
   // Test upload function
   const testUpload = async (file) => {
     try {
       const result = await uploadFile(file, auth.currentUser.uid);
       console.log('Upload successful:', result);
     } catch (error) {
       console.error('Upload failed:', error);
     }
   };
   ```

## Alternative: Server-Side Upload
If CORS issues persist, consider implementing server-side file upload through your backend API instead of direct client-to-Firebase uploads. 