'use client';

import { Image, Video, FileText, Download, Eye } from 'lucide-react';
import { getFileCategory, formatFileSize } from '@/lib/fileUpload';

interface FileMessageProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: any;
  formatTime: (timestamp: any) => string;
}

export default function FileMessage({ 
  fileUrl, 
  fileName, 
  fileSize, 
  fileType, 
  timestamp, 
  formatTime 
}: FileMessageProps) {
  const category = getFileCategory(fileType);

  const getFileIcon = () => {
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="max-w-xs">
      {category === 'image' ? (
        <div className="relative group">
          <img 
            src={fileUrl} 
            alt={fileName}
            className="rounded-lg max-w-full h-auto cursor-pointer"
            onClick={handlePreview}
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <button 
              onClick={handlePreview}
              className="bg-white bg-opacity-20 p-2 rounded-full mr-2"
            >
              <Eye size={20} className="text-white" />
            </button>
            <button 
              onClick={handleDownload}
              className="bg-white bg-opacity-20 p-2 rounded-full"
            >
              <Download size={20} className="text-white" />
            </button>
          </div>
        </div>
      ) : category === 'video' ? (
        <div className="relative">
          <video 
            src={fileUrl}
            controls
            className="rounded-lg max-w-full h-auto"
            preload="metadata"
          />
          <button 
            onClick={handleDownload}
            className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full hover:bg-opacity-70"
          >
            <Download size={16} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {getFileIcon()}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{fileName}</p>
                <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
              </div>
            </div>
            <div className="flex space-x-1 ml-2">
              <button 
                onClick={handlePreview}
                className="p-1 hover:bg-gray-200 rounded"
                title="Preview"
              >
                <Eye size={16} className="text-gray-600" />
              </button>
              <button 
                onClick={handleDownload}
                className="p-1 hover:bg-gray-200 rounded"
                title="Download"
              >
                <Download size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="text-xs opacity-70 mt-1">
        {formatTime(timestamp)}
      </div>
    </div>
  );
} 