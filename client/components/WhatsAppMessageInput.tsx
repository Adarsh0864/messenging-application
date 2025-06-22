'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import QuickFileUpload from './QuickFileUpload';
import { UploadedFile } from '@/lib/fileUpload';

interface WhatsAppMessageInputProps {
  onSendMessage: (message: string, file?: any) => Promise<void>;
  userId: string;
}

export default function WhatsAppMessageInput({ onSendMessage, userId }: WhatsAppMessageInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const messageToSend = message.trim();
    setMessage('');
    setIsLoading(true);

    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageToSend); // Restore message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: UploadedFile) => {
    setIsLoading(true);
    try {
      // Convert UploadedFile to the format expected by the messaging interface
      const cloudinaryFile = {
        url: file.url,
        publicId: '', // Not available from Firebase upload
        format: file.type.split('/')[1] || 'unknown',
        resourceType: file.type.startsWith('image/') ? 'image' as const : 
                     file.type.startsWith('video/') ? 'video' as const : 'raw' as const,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };
      
      await onSendMessage('', cloudinaryFile);
      setShowFileUpload(false);
    } catch (error) {
      console.error('Error sending file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  return (
    <>
      <div className="border-t border-gray-200 px-4 py-3 bg-white">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => setShowFileUpload(true)}
            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 overflow-y-auto"
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="flex-shrink-0 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Share File</h2>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <QuickFileUpload
              onFileUploaded={handleFileUpload}
              userId={userId}
            />
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowFileUpload(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 