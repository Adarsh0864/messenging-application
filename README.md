# Real-time Messaging App

A modern, real-time messaging application built with Next.js, Express.js, Firebase, and WebRTC. Features include text messaging, voice calls, video calls, and real-time status updates.

![Messaging App Screenshot](screenshot.png)

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

## 📁 Project Structure

```
messaging-web-app/
├── client/                     # Next.js frontend
│   ├── app/                   # App router pages
│   │   ├── auth/             # Authentication pages
│   │   │   ├── login/        # Login page
│   │   │   └── register/     # Registration page
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/           # React components
│   │   ├── MessagingInterface.tsx  # Main chat interface
│   │   └── CallInterface.tsx       # Video/audio calling
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx   # Authentication context
│   ├── lib/                  # Utilities and configs
│   │   └── firebase.ts       # Firebase client config
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── next.config.js
├── server/                    # Express.js backend
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   │   └── firebase.ts   # Firebase Admin config
│   │   ├── middleware/       # Express middleware
│   │   │   └── auth.ts       # JWT authentication
│   │   ├── routes/           # API routes
│   │   │   ├── users.ts      # User management
│   │   │   ├── messages.ts   # Message operations
│   │   │   └── conversations.ts # Conversation management
│   │   └── index.ts          # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── nodemon.json
├── package.json              # Root package.json
└── README.md
```

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

### 5. Firestore Security Rules

In Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Allow reading other users for contacts
    }
    
    // Conversations - users can only access conversations they're part of
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.userIds;
      allow create: if request.auth != null &&
        request.auth.uid in request.resource.data.userIds;
        
      // Messages within conversations
      match /messages/{messageId} {
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.userIds;
      }
    }
  }
}
```

### 6. Run the Application

```bash
# Development mode (runs both client and server)
npm run dev

# Or run separately:
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client  
cd client && npm run dev
```

## 🌐 Usage

### Getting Started
1. Open http://localhost:3000
2. Register a new account or login
3. Start messaging with other users
4. Use the phone/video icons to make calls

### Features Guide

#### Messaging
- Click on any contact to start a conversation
- Type in the message input and press Enter to send
- Messages appear in real-time for both users
- See online/offline status of contacts

#### Voice & Video Calls
- Click the phone icon for voice calls
- Click the video icon for video calls
- Accept/reject incoming calls
- Use controls to mute/unmute or turn video on/off
- End calls with the red phone button

#### User Management
- Update your profile and status
- See when contacts were last online
- Manage conversation history

## 🔥 Firebase Collections Structure

### users
```javascript
{
  uid: "user-id",
  name: "John Doe", 
  email: "john@example.com",
  online: true,
  lastSeen: timestamp
}
```

### conversations
```javascript
{
  userIds: ["uid1", "uid2"],
  lastMessage: "Hello there!",
  lastUpdated: timestamp,
  lastMessageSenderId: "uid1"
}
```

### messages (subcollection of conversations)
```javascript
{
  text: "Hello there!",
  senderId: "uid1", 
  receiverId: "uid2",
  timestamp: timestamp,
  conversationId: "conversation-id",
  read: false
}
```

## 🚀 Deployment

### Client (Vercel)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Server (Railway/Heroku)
1. Create new app on Railway or Heroku
2. Set environment variables
3. Deploy from GitHub

### Production Considerations
- Use production Firebase project
- Set up proper CORS origins
- Use HTTPS for WebRTC
- Configure proper security rules
- Set up monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

#### Firebase Connection Error
- Verify environment variables are correct
- Check Firebase project settings
- Ensure Firestore is enabled

#### WebRTC Connection Failed
- Ensure HTTPS in production
- Check firewall/NAT settings
- Verify STUN/TURN server configuration

#### Real-time Updates Not Working
- Check Firestore security rules
- Verify network connection
- Check browser console for errors

### Getting Help
- Check the browser console for errors
- Verify all environment variables are set
- Ensure Firebase project is properly configured
- Check network connectivity for WebRTC features

## 🎯 Future Enhancements

- [ ] Group messaging
- [ ] File/image sharing
- [ ] Push notifications
- [ ] Message encryption
- [ ] Screen sharing during calls
- [ ] Message reactions
- [ ] Dark mode
- [ ] Mobile app versions

---

Built with ❤️ using Next.js, Express.js, and Firebase 