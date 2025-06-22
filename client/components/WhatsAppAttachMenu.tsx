'use client';

import { useState, useRef } from 'react';
import { Camera, Image, FileText, Music, MapPin, User, X, Plus } from 'lucide-react';
import { uploadToCloudinary, CloudinaryUploadedFile, CloudinaryUploadProgress } from '@/lib/cloudinaryUpload';
import { toast } from 'react-hot-toast';

interface WhatsAppAttachMenuProps {
  onFileUploaded: (file: CloudinaryUploadedFile) => void;
  onClose: () => void;
  userId: string;
  isOpen: boolean;
}

export default function WhatsAppAttachMenu({ onFileUploaded, onClose, userId, isOpen }: WhatsAppAttachMenuProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null, fileType: string) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    
    try {
      const toastId = toast.loading(`Uploading ${fileType}...`);
      
      const uploadedFile = await uploadToCloudinary(file, userId, (progress: CloudinaryUploadProgress) => {
        if (progress.error) {
          toast.error(progress.error, { id: toastId });
        } else if (progress.progress === 100) {
          toast.success(`${fileType} sent!`, { id: toastId });
        } else {
          toast.loading(`Uploading ${fileType}... ${Math.round(progress.progress)}%`, { id: toastId });
        }
      });
      
      onFileUploaded(uploadedFile);
      onClose();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to send ${fileType}: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const selectFile = (accept: string, fileType: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        handleFileUpload(target.files, fileType);
        target.value = '';
      };
      fileInputRef.current.click();
    }
  };

  const attachmentOptions = [
    {
      icon: FileText,
      label: 'Document',
      color: 'bg-blue-500',
      accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
      type: 'document'
    },
    {
      icon: Camera,
      label: 'Camera',
      color: 'bg-pink-500',
      accept: 'image/*',
      type: 'photo',
      action: () => {
        // For now, just open file picker. Could implement camera capture later
        selectFile('image/*', 'photo');
      }
    },
    {
      icon: Image,
      label: 'Gallery',
      color: 'bg-purple-500',
      accept: 'image/*,video/*',
      type: 'media'
    },
    {
      icon: Music,
      label: 'Audio',
      color: 'bg-orange-500',
      accept: 'audio/*',
      type: 'audio'
    },
    {
      icon: MapPin,
      label: 'Location',
      color: 'bg-green-500',
      accept: '',
      type: 'location',
      action: () => {
        toast('Location sharing coming soon!', { icon: '📍' });
        onClose();
      }
    },
    {
      icon: User,
      label: 'Contact',
      color: 'bg-blue-600',
      accept: '',
      type: 'contact',
      action: () => {
        toast('Contact sharing coming soon!', { icon: '👤' });
        onClose();
      }
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Attachment menu */}
      <div className="fixed bottom-20 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 min-w-[280px]">
          <div className="grid grid-cols-3 gap-4">
            {attachmentOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (option.action) {
                      option.action();
                    } else {
                      selectFile(option.accept, option.type);
                    }
                  }}
                  disabled={isUploading}
                  className="flex flex-col items-center space-y-2 p-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <div className={`w-12 h-12 ${option.color} rounded-full flex items-center justify-center`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <span className="text-xs text-gray-700 font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full p-1 hover:bg-gray-700 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={() => {}} // Handled in selectFile function
      />
    </>
  );
} 