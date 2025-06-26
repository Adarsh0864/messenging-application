'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import WhatsAppAttachMenu from './WhatsAppAttachMenu';

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

  const handleFileUpload = async (file: any) => {
    setIsLoading(true);
    try {
      await onSendMessage('', file);
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
      <WhatsAppAttachMenu
        onFileUploaded={handleFileUpload}
        onClose={() => setShowFileUpload(false)}
        userId={userId}
        isOpen={showFileUpload}
      />
    </>
  );
} 