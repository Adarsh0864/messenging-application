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

## 🚀 Deployment & Updates

### Initial Deployment

#### Client (Vercel)
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_API_URL=https://your-server-domain.com
   ```
4. Deploy automatically

#### Server (Railway/Heroku/DigitalOcean)
1. Choose your hosting platform
2. Connect your repository
3. Set environment variables:
   ```
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   CLIENT_URL=https://your-vercel-app.vercel.app
   PORT=5000
   ```
4. Deploy

### Adding New Features & Updates

#### Development Workflow
```bash
# 1. Pull latest code
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-feature-name

# 3. Make your changes
# Edit files, add features, fix bugs...

# 4. Test locally
npm run dev

# 5. Commit changes
git add .
git commit -m "Add: new feature description"

# 6. Push to GitHub
git push origin feature/new-feature-name

# 7. Create Pull Request and merge to main
```

#### Automatic Deployment
- **Vercel**: Automatically deploys on every push to main branch
- **Railway/Heroku**: Automatically deploys on every push to main branch

#### Manual Deployment Commands
```bash
# Build and deploy client
cd client
npm run build
vercel --prod

# Build and deploy server
cd server
npm run build
# Deploy to your platform
```

### Database Updates

#### Firestore Schema Changes
1. Test changes in development environment first
2. Update Firestore security rules if needed:
   ```javascript
   // In Firebase Console > Firestore > Rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Add new collection rules here
     }
   }
   ```
3. Deploy rules from Firebase Console

#### Migration Scripts
Create migration scripts for data structure changes:
```javascript
// scripts/migrate.js
const admin = require('firebase-admin');
// Add migration logic
```

### Environment Management

#### Multiple Environments
- **Development**: Local environment with test Firebase project
- **Staging**: Preview deployments for testing
- **Production**: Live application

#### Environment Variables
```bash
# Development (.env.local)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-dev
NEXT_PUBLIC_API_URL=http://localhost:5000

# Production (Vercel Dashboard)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-prod
NEXT_PUBLIC_API_URL=https://api.yourapp.com
```

### Monitoring & Maintenance

#### Performance Monitoring
- Use Vercel Analytics for frontend performance
- Monitor server logs in Railway/Heroku dashboard
- Set up Firebase Performance Monitoring

#### Error Tracking
```bash
# Add error tracking (optional)
npm install @sentry/nextjs @sentry/node
```

#### Database Backup
- Firestore: Enable daily backups in Firebase Console
- Regular exports for critical data

### Rollback Strategy

#### If Issues Arise After Deployment
1. **Quick Fix**: 
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Emergency Rollback**:
   - Vercel: Use previous deployment from dashboard
   - Railway/Heroku: Rollback from platform dashboard

3. **Database Rollback**:
   - Restore from Firestore backup
   - Run reverse migration scripts

### Security Considerations

#### Regular Updates
```bash
# Update dependencies monthly
npm audit
npm update

# Security patches
npm audit fix
```

#### Environment Security
- Rotate API keys every 6 months
- Review Firestore security rules regularly
- Monitor unusual activity in Firebase Console

### Performance Optimization

#### Before Major Updates
- Run performance tests
- Check bundle size: `npm run build`
- Test on various devices and networks
- Monitor Core Web Vitals

## 🔄 CI/CD Pipeline (Optional Advanced Setup)

### GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## 🚨 Troubleshooting Deployment

### Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

#### Environment Variables Not Working
- Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side
- Restart deployment after adding new variables
- Check variable names match exactly

#### WebRTC Not Working in Production
- Ensure HTTPS is enabled
- Configure STUN/TURN servers for production
- Check firewall settings

#### Firebase Connection Issues
- Verify project ID and credentials
- Check Firestore rules
- Ensure service account has correct permissions

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