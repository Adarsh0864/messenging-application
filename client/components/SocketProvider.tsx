'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionAttempts: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionAttempts: 0
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

export default function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [maxAttempts] = useState(3); // Limit connection attempts
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = (socket: Socket) => {
    // Clear any existing heartbeat
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    // Send ping every 30 seconds
    heartbeatInterval.current = setInterval(() => {
      if (socket && socket.connected) {
        console.log('Sending heartbeat ping');
        socket.emit('ping');
        
        // Set a timeout for pong response
        const pongTimeout = setTimeout(() => {
          console.log('Heartbeat failed - no pong received');
          socket.disconnect();
        }, 5000); // 5 second timeout for pong

        socket.once('pong', () => {
          console.log('Heartbeat pong received');
          clearTimeout(pongTimeout);
        });
      }
    }, 30000); // 30 seconds
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  useEffect(() => {
    if (connectionAttempts >= maxAttempts) {
      console.log('Max connection attempts reached. App will work without real-time features.');
      // Show user-friendly message about offline mode
      toast('App running in offline mode. Refresh page to see new messages.', {
        icon: 'ℹ️',
        duration: 5000
      });
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!backendUrl) {
      console.warn('Backend URL not configured. App will work without real-time features.');
      return;
    }

    console.log(`Attempting to connect to backend: ${backendUrl} (attempt ${connectionAttempts + 1}/${maxAttempts})`);

    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'], // Try both transports
      timeout: 10000, // 10 second timeout
      reconnectionAttempts: 2, // Limited reconnection attempts
      reconnectionDelay: 2000,
      forceNew: true // Force new connection
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setIsConnected(true);
      setSocket(newSocket);
      
      // Reset connection attempts on successful connection
      setConnectionAttempts(0);
      
      // Start heartbeat
      startHeartbeat(newSocket);
      
      toast.success('Real-time features enabled!', { duration: 3000 });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        // Server disconnected, don't try to reconnect automatically
        console.log('Server disconnected. App will work without real-time features.');
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Network issues, attempt to reconnect after delay
        console.log('Network issue detected, will attempt reconnect...');
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        reconnectTimeout.current = setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
        }, 3000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.log(`❌ Socket connection error (attempt ${connectionAttempts + 1}):`, error.message);
      setIsConnected(false);
      stopHeartbeat();
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
      
      // Clean up this socket attempt
      newSocket.close();
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      toast.success('Connection restored!', { duration: 2000 });
    });

    newSocket.on('reconnect_error', (error) => {
      console.log('Reconnection failed:', error.message);
    });

    // Cleanup function
    return () => {
      stopHeartbeat();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [connectionAttempts, maxAttempts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionAttempts }}>
      {children}
    </SocketContext.Provider>
  );
} 