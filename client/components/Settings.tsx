'use client';

import { useState, useRef } from 'react';
import { 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Globe, 
  Camera, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  Trash2,
  Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile states
  const [profileData, setProfileData] = useState({
    name: userProfile?.name || '',
    email: userProfile?.email || '',
    bio: userProfile?.bio || '',
    phoneNumber: userProfile?.phoneNumber || '',
    profilePicture: userProfile?.profilePicture || ''
  });

  // Password states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // App preferences
  const [preferences, setPreferences] = useState({
    notifications: userProfile?.preferences?.notifications ?? true,
    soundEnabled: userProfile?.preferences?.soundEnabled ?? true,
    theme: userProfile?.preferences?.theme || 'light',
    language: userProfile?.preferences?.language || 'en',
    autoDownload: userProfile?.preferences?.autoDownload ?? true,
    readReceipts: userProfile?.preferences?.readReceipts ?? true,
    lastSeen: userProfile?.preferences?.lastSeen ?? true,
    profilePhotoVisibility: userProfile?.preferences?.profilePhotoVisibility || 'everyone'
  });

  const handleProfileUpdate = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Update Firestore document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: profileData.name,
        bio: profileData.bio,
        phoneNumber: profileData.phoneNumber,
        profilePicture: profileData.profilePicture,
        updatedAt: new Date()
      });

      // Update email if changed
      if (profileData.email !== currentUser.email) {
        await updateEmail(currentUser, profileData.email);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          email: profileData.email
        });
      }

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentUser) return;
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(currentUser, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully!');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        preferences,
        updatedAt: new Date()
      });
      toast.success('Preferences updated successfully!');
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (file: File) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const storageRef = ref(storage, `profile_pictures/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfileData(prev => ({ ...prev, profilePicture: downloadURL }));
      toast.success('Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      profile: profileData,
      preferences,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `messenger-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully!');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'advanced', label: 'Advanced', icon: Globe }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 bg-gray-50 border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Profile Settings</h3>
              
              {/* Profile Picture */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {profileData.profilePicture ? (
                      <img
                        src={profileData.profilePicture}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                        <User size={32} className="text-gray-600" />
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600"
                    >
                      <Camera size={16} />
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      Upload New
                    </button>
                    {profileData.profilePicture && (
                      <button
                        onClick={() => setProfileData(prev => ({ ...prev, profilePicture: '' }))}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfilePictureUpload(file);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileData.phoneNumber}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell others about yourself..."
                  />
                </div>
              </div>

              {/* Change Password */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Change Password</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <button
                    onClick={handlePasswordUpdate}
                    disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    Update Password
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Notification Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-gray-600">Receive notifications for new messages</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={(e) => setPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Sound Effects</h4>
                    <p className="text-sm text-gray-600">Play sounds for notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.soundEnabled}
                      onChange={(e) => setPreferences(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handlePreferencesUpdate}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Privacy Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Read Receipts</h4>
                    <p className="text-sm text-gray-600">Let others know when you've read their messages</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.readReceipts}
                      onChange={(e) => setPreferences(prev => ({ ...prev, readReceipts: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Last Seen</h4>
                    <p className="text-sm text-gray-600">Show when you were last online</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.lastSeen}
                      onChange={(e) => setPreferences(prev => ({ ...prev, lastSeen: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo Visibility
                  </label>
                  <select
                    value={preferences.profilePhotoVisibility}
                    onChange={(e) => setPreferences(prev => ({ ...prev, profilePhotoVisibility: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handlePreferencesUpdate}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Appearance Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handlePreferencesUpdate}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Advanced Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-download Media</h4>
                    <p className="text-sm text-gray-600">Automatically download images and videos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.autoDownload}
                      onChange={(e) => setPreferences(prev => ({ ...prev, autoDownload: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Data Management</h4>
                  <div className="space-y-3">
                    <button
                      onClick={exportData}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                      <Download size={20} />
                      <span>Export My Data</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all local data? This action cannot be undone.')) {
                          localStorage.clear();
                          sessionStorage.clear();
                          toast.success('Cache cleared successfully');
                        }
                      }}
                      className="flex items-center space-x-2 text-orange-600 hover:text-orange-800"
                    >
                      <Trash2 size={20} />
                      <span>Clear Cache</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handlePreferencesUpdate}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 