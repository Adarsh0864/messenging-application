'use client';

import { useState, useRef } from 'react';
import { Image, Video, FileText, Upload, X, AlertCircle } from 'lucide-react';
import { uploadFile, FileUploadProgress, UploadedFile, formatFileSize, getFileCategory } from '@/lib/fileUpload';

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
  onClose: () => void;
  userId: string;
  autoSend?: boolean;
}

interface FileWithProgress {
  file: File;
  progress: number;
  error?: string;
  uploaded?: UploadedFile;
}

export default function FileUpload({ onFileUploaded, onClose, userId, autoSend = false }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithProgress[] = Array.from(selectedFiles).map(file => ({
      file,
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Start uploading each file
    newFiles.forEach((fileWithProgress, index) => {
      uploadFile(
        fileWithProgress.file,
        userId,
        (progress: FileUploadProgress) => {
          setFiles(prev => 
            prev.map((f, i) => 
              f.file === fileWithProgress.file 
                ? { 
                    ...f, 
                    progress: progress.progress,
                    error: progress.error,
                    uploaded: progress.url ? {
                      url: progress.url,
                      name: f.file.name,
                      size: f.file.size,
                      type: f.file.type
                    } : undefined
                  }
                : f
            )
          );
        }
      ).then((uploadedFile) => {
        setFiles(prev => 
          prev.map(f => 
            f.file === fileWithProgress.file 
              ? { ...f, uploaded: uploadedFile, progress: 100 }
              : f
          )
        );
        
        // Auto-send if enabled
        if (autoSend) {
          onFileUploaded(uploadedFile);
          setFiles(prev => prev.filter(f => f.uploaded !== uploadedFile));
        }
      }).catch((error) => {
        setFiles(prev => 
          prev.map(f => 
            f.file === fileWithProgress.file 
              ? { ...f, error: error.message, progress: 0 }
              : f
          )
        );
      });
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f.file !== fileToRemove));
  };

  const sendFile = (uploadedFile: UploadedFile) => {
    onFileUploaded(uploadedFile);
    setFiles(prev => prev.filter(f => f.uploaded !== uploadedFile));
  };

  const getFileIcon = (fileType: string) => {
    const category = getFileCategory(fileType);
    switch (category) {
      case 'image':
        return <Image size={20} className="text-green-500" />;
      case 'video':
        return <Video size={20} className="text-blue-500" />;
      case 'document':
        return <FileText size={20} className="text-red-500" />;
      default:
        return <FileText size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold">Share Files</h2>
            {autoSend && (
              <p className="text-sm text-gray-600">Files will be sent automatically after upload</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Drag and drop files here, or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Browse Files
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Supports images, videos, and documents up to 10MB
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        />

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Files</h3>
            {files.map((fileWithProgress, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(fileWithProgress.file.type)}
                    <div>
                      <p className="font-medium text-sm">{fileWithProgress.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(fileWithProgress.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {fileWithProgress.uploaded && !autoSend && (
                      <button
                        onClick={() => sendFile(fileWithProgress.uploaded!)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                      >
                        Send
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(fileWithProgress.file)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {fileWithProgress.progress > 0 && fileWithProgress.progress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fileWithProgress.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {fileWithProgress.error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm">
                    <AlertCircle size={16} />
                    <span>{fileWithProgress.error}</span>
                  </div>
                )}

                {/* Success Message */}
                {fileWithProgress.uploaded && (
                  <div className="text-green-600 text-sm">
                    {autoSend ? '✓ File sent successfully!' : '✓ Upload complete - Ready to send'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex space-x-4">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  handleFileSelect(target.files);
                };
                input.click();
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              <Image size={16} />
              <span>Photos</span>
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  handleFileSelect(target.files);
                };
                input.click();
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              <Video size={16} />
              <span>Videos</span>
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
                input.multiple = true;
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  handleFileSelect(target.files);
                };
                input.click();
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              <FileText size={16} />
              <span>Documents</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 