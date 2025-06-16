# Real-time Messaging App

A modern, real-time messaging application built with Next.js, Express.js, Firebase, and WebRTC. Features include text messaging, voice calls, video calls, and real-time status updates.



## 🚀 Features

- **Real-time Messaging**: Send and receive messages instantly
- **Voice & Video Calls**: WebRTC-powered calling with screen sharing
- **User Authentication**: Secure Firebase authentication
- **Online Status**: See when contacts are online/offline
- **Responsive Design**: Modern UI that works on all devices
- **Message History**: Persistent message storage
- **Typing Indicators**: See when someone is typing
- **Call Management**: Accept, reject, and end calls

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase SDK** - Authentication and Firestore
- **Socket.IO Client** - Real-time communication
- **Simple-peer** - WebRTC wrapper for peer-to-peer connections
- **React Hot Toast** - Toast notifications

### Backend
- **Node.js & Express.js** - Server framework
- **TypeScript** - Type safety
- **Socket.IO** - WebRTC signaling server
- **Firebase Admin SDK** - Server-side Firebase integration
- **CORS & Helmet** - Security middleware

### Database & Services
- **Firebase Firestore** - NoSQL document database
- **Firebase Authentication** - User management
- **WebRTC** - Peer-to-peer video/audio calling

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd messaging-web-app
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client and server dependencies
npm run install:all
```

### 3. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication with Email/Password
4. Create a Firestore database
5. Set up security rules (see below)

#### Get Firebase Configuration
1. Go to Project Settings > General
2. Scroll down to "Your apps" and click "Web"
3. Register your app and copy the config
4. Go to Project Settings > Service Accounts
5. Generate a new private key (download JSON)

### 4. Environment Configuration

#### Client Environment (.env.local)
Create `client/.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

#### Server Environment (.env)
Create `server/.env`:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```


 

  
