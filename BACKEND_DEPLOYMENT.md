# 🚀 Backend Deployment Guide

## Deploy Your Video Call Server to Railway

### Step 1: Sign Up for Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Click "New Project" → "Deploy from GitHub repo"

### Step 2: Connect Your Repository
1. Select your repository: `Adarsh0864/messenging-application`
2. Choose the `server` folder as the root directory
3. Railway will auto-detect it's a Node.js project

### Step 3: Add Environment Variables
In Railway dashboard, go to Variables tab and add:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=messenging-app-b43da
FIREBASE_PRIVATE_KEY_ID=47735b29cf2294f6dcd3ca69e865af3400591c1a
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2/T2seB8+53MO\nH7Ll/NSQqLnDZgGGBElmKp+NkSRMFnVaY2wQR0TtheR65+ypTdCZPZ1rjT2Bn0ir\nLxTnR9zUpWmQAi4/p8R6hEiuNMPnw401nYMkZzVJeElqswpUCCCHPODd0lZH/6cS\n+2ncCB4SHwbOuSW1R/FszexHD8NJuMJXA2hmx2OVM6zfopgOxqskcWgtyilJav6y\nCjSTXV7eHSUu3gpcxFsEriyoADqrh+GD66qO89ce8ad0tubZQr8Vea1MjGfr3PLL\nj9tt1OUg6SIj/dZvdqMx5AUm/QvsLleXexyoHpr+V4MW09z5bu+KI4yTE9Up2xnA\nuVKc3Cw3AgMBAAECggEAA2tbSCxlhiQXhBEmCcB+FdOoPlD9JuYuNRLlSm2xdNe5\n7OzVjK3J2oKGOm2WKvgitXFJI7xCFfAXVQkqFv+gZ93Enun56u5kUnldM8k35SN/\n04H0WrGOF6e73RJj39nG5MM/KacJkz3YsltXeCkzmqYVLIQQ+kke50o4Um7zRY2p\nNxZ03gsGiIBQHDfHEUMLIUBY64MIcPXClxAT7f8CbagH2rcFqxyoAxxLUmV/1cWf\n4ZtwAIoomc+fDoSCXkkNc3b9t2ofuH8J5O//mNEhrDeNd3Tq/iL6ARH/RBngisHS\nxWQyNiupMcCeYdLUoa6unlZCHyiDI1DcokAl+GJexQKBgQDk3spmLHkrZodsSsCW\nDgbgY8z3bBTx5oGakv1uq3+/BYRFNN/emQsPBnhKFfByfQiMFdbCCNrkfPvILNZk\njuV+zBSzN9JMYenu+XiCfXYkUz6X7nQ5Zz/eUFKI0+z9gahreYQsrak01LwI/L+/\nfO9svL7b0OCjtnd9dHBQA6v6SwKBgQDMrilXBbZHVRBzZK4lxMzzDpIwqnjjvjwl\nuzmbcp6mGLufWFhwWBqPIydkQyMHNPVR5cSwneUIveJDiUXCCuF6A3fO+3WTgQLB\n/caLoOLnoFVkudYrEmE7Hpgq2qjLXn8bz3gam+hYQij7/CCMcz3bizADdY0Rco2P\n1+wQznNiRQKBgQDDcVGL0PykSEjq/CbbvRy4L+GPhDeanwocEtvizwcm+7IJW261\nayHbcd30/ik3y3gqEFg1mFQ8fFKSjV+DvddS4TnoFYo7ef3H+jejzzm9KW0xVwrf\nHkGXOiZQ/BDMJxXIuZtaf+4X1HbCgfvIrQrUY5Xkpsm+ZApEEtP6MDiDYwKBgFCq\nz0YpzSYd42bnJi9iebfNZVZiyVRQtFnWiSS3rskddEyfv/M+9fC11R+Ryitb9td5\nK+TDxfGFDLi7UE/ig+zXkw9zUWp57QFRqD99gA/zw9P33e2Jx+JJ84ToOqA0NPpb\n8STjj1XBdW+idZ2FCbsOBzVFzfwzXpFzculIxHbVAoGBAKD3zzna9Rk845Rzb0rQ\nSwVr5j7XmTQpL6zq8r4w7pWM1SzuDlWLgYSWAYUZGhbLNY1I+tyAK+VVETxqGJha\nY4L22UPKXSUCvFkKVFkio82HKem5ciIDRBFBXVaL+XYOiAKLPbkRxATrdMma33uJ\np4Uu/K8BAYfuxaLLXkyI5dY3\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@messenging-app-b43da.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=101631654259952341287

# Server Config
PORT=8000
CLIENT_URL=https://messenger-bgtjnobcu-adarsh0864s-projects.vercel.app
NODE_ENV=production
```

### Step 4: Deploy
1. Railway will automatically build and deploy
2. Get your deployment URL (e.g., `https://your-app.railway.app`)
3. Test it by visiting: `https://your-app.railway.app/health`

### Step 5: Update Vercel
1. Go to Vercel dashboard
2. Go to your project settings → Environment Variables
3. Add: `NEXT_PUBLIC_API_URL=https://your-app.railway.app`
4. Redeploy your Vercel app

## 🎉 Result
- ✅ Frontend on Vercel: User interface + messaging
- ✅ Backend on Railway: Video calls + WebSocket
- ✅ Full video calling functionality!

## Alternative: Quick Test Locally
To test video calls now:
1. Run backend: `cd server && npm run dev` (port 8000)
2. Run frontend: `cd client && npm run dev` (port 3000)
3. Open http://localhost:3000 and test video calls! 