'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Phone, Video, MoreVertical, Send, Paperclip, Smile, UserPlus } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: any;
  conversationId: string;
}

interface Contact {
  uid: string;
  name: string;
  email: string;
  online: boolean;
  lastSeen: any;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount?: number;
}

interface Conversation {
  id: string;
  userIds: string[];
  lastMessage: string;
  lastUpdated: any;
  lastMessageSenderId: string;
}

export default function MessagingInterface() {
  const { currentUser, userProfile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch contacts and conversations
  useEffect(() => {
    if (!currentUser) return;

    const fetchContacts = async () => {
      try {
        // Get all users except current user
        const usersQuery = query(
          collection(db, 'users'),
          where('uid', '!=', currentUser.uid)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          ...doc.data(),
          uid: doc.id
        })) as Contact[];

        // Get conversations for current user
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('userIds', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
          const conversations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Conversation[];

          // Enrich contacts with conversation data
          const enrichedContacts = await Promise.all(
            usersData.map(async (user) => {
              const conversation = conversations.find(conv => 
                conv.userIds.includes(user.uid)
              );
              
              return {
                ...user,
                lastMessage: conversation?.lastMessage || '',
                lastMessageTime: conversation?.lastUpdated,
                unreadCount: 0 // TODO: Implement unread count
              };
            })
          );

          // Sort by last message time
          enrichedContacts.sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return b.lastMessageTime.seconds - a.lastMessageTime.seconds;
          });

          setContacts(enrichedContacts);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUser]);

  // Listen to messages for selected conversation
  useEffect(() => {
    if (!currentUser || !selectedContact) return;

    const conversationId = [currentUser.uid, selectedContact.uid].sort().join('_');
    
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [currentUser, selectedContact]);

  const sendMessage = async () => {
    if (!currentUser || !selectedContact || !newMessage.trim()) return;

    try {
      const conversationId = [currentUser.uid, selectedContact.uid].sort().join('_');
      
      // Add message to subcollection
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        receiverId: selectedContact.uid,
        timestamp: serverTimestamp(),
        conversationId
      });

      // Update or create conversation document
      await setDoc(doc(db, 'conversations', conversationId), {
        userIds: [currentUser.uid, selectedContact.uid],
        lastMessage: newMessage.trim(),
        lastUpdated: serverTimestamp(),
        lastMessageSenderId: currentUser.uid
      }, { merge: true });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const addNewUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim()) return;

    try {
      // Create a new user document (this would normally be done during registration)
      const newUserId = 'user_' + Date.now(); // Simple ID generation
      await setDoc(doc(db, 'users', newUserId), {
        uid: newUserId,
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        online: false,
        lastSeen: new Date()
      });

      setNewUserEmail('');
      setNewUserName('');
      setShowAddUser(false);
      
      // Refresh the page to show new user
      window.location.reload();
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getContactColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to continue</h2>
          <p className="text-gray-600">You need to be authenticated to access the messaging interface.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Contacts Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Messages</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddUser(true)}
                className="p-2 hover:bg-gray-100 rounded-full text-blue-500"
                title="Add new user"
              >
                <UserPlus size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <MoreVertical size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <LoadingSpinner text="Loading contacts..." />
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No contacts found</p>
              <p className="text-sm mt-1">Register users or add contacts to get started</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
            <div
              key={contact.uid}
              onClick={() => setSelectedContact(contact)}
              className={`contact-item ${selectedContact?.uid === contact.uid ? 'active' : ''}`}
            >
              <div className="relative">
                <div className={`w-12 h-12 ${getContactColor(contact.name)} rounded-full flex items-center justify-center text-white font-medium`}>
                  {getInitials(contact.name)}
                </div>
                {contact.online && (
                  <div className="online-indicator absolute -bottom-1 -right-1"></div>
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900 truncate">{contact.name}</h3>
                  <span className="text-xs text-gray-500">
                    {formatTime(contact.lastMessageTime)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {contact.lastMessage || 'No messages yet'}
                </p>
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-10 h-10 ${getContactColor(selectedContact.name)} rounded-full flex items-center justify-center text-white font-medium`}>
                  {getInitials(selectedContact.name)}
                </div>
                <div className="ml-3">
                  <h2 className="font-medium text-gray-900">{selectedContact.name}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedContact.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Phone size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Video size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <MoreVertical size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Send size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                    <p className="text-gray-500">Start a conversation with {selectedContact.name}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <span className="text-sm text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                      Today
                    </span>
                  </div>
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`chat-message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}>
                        <p className="text-sm">{message.text}</p>
                        <div className="text-xs opacity-70 mt-1">
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Paperclip size={20} className="text-gray-600" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full">
                    <Smile size={18} className="text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Search size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add New User</h2>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addNewUser}
                disabled={!newUserName.trim() || !newUserEmail.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 