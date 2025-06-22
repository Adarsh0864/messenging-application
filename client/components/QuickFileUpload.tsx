'use client';

import { useRef } from 'react';
import { Image, Video, FileText, Camera } from 'lucide-react';
import { uploadFile, UploadedFile } from '@/lib/fileUpload';
import { toast } from 'react-hot-toast';

interface QuickFileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
  userId: string;
  className?: string;
}

export default function QuickFileUpload({ onFileUploaded, userId, className = '' }: QuickFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Take the first file for quick upload
    
    try {
      toast.loading(`Uploading ${file.name}...`, { id: `upload-${file.name}` });
      
      const uploadedFile = await uploadFile(file, userId, (progress) => {
        if (progress.progress === 100) {
          toast.success(`${file.name} uploaded successfully!`, { id: `upload-${file.name}` });
        }
      });
      
      // Immediately send the file
      onFileUploaded(uploadedFile);
      toast.success(`${file.name} sent!`);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}: ${error.message}`, { id: `upload-${file.name}` });
    }
  };

  const selectFiles = (accept: string, inputRef: React.RefObject<HTMLInputElement>) => {
    if (inputRef.current) {
      inputRef.current.accept = accept;
      inputRef.current.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        handleFileUpload(target.files);
        // Reset the input so the same file can be selected again
        target.value = '';
      };
      inputRef.current.click();
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" className="hidden" multiple />
      <input ref={imageInputRef} type="file" className="hidden" />
      <input ref={videoInputRef} type="file" className="hidden" />
      <input ref={documentInputRef} type="file" className="hidden" />
      
      {/* Quick action buttons */}
      <button
        onClick={() => selectFiles('image/*', imageInputRef)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Send Photo"
      >
        <Image size={18} className="text-green-600" />
      </button>
      
      <button
        onClick={() => selectFiles('video/*', videoInputRef)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Send Video"
      >
        <Video size={18} className="text-blue-600" />
      </button>
      
      <button
        onClick={() => selectFiles('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv', documentInputRef)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Send Document"
      >
        <FileText size={18} className="text-red-600" />
      </button>

      {/* Camera/All files button */}
      <button
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
            fileInputRef.current.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              handleFileUpload(target.files);
              target.value = '';
            };
            fileInputRef.current.click();
          }
        }}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Send Any File"
      >
        <Camera size={18} className="text-gray-600" />
      </button>
    </div>
  );
} 