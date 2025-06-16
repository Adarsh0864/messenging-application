'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface CallInterfaceProps {
  recipientId: string;
  recipientName: string;
  onCallEnd: () => void;
  onCallStart?: () => void;
}

interface IncomingCallData {
  from: string;
  signal: any;
  type: 'audio' | 'video';
  callerName: string;
}

export default function CallInterface({ recipientId, recipientName, onCallEnd, onCallStart }: CallInterfaceProps) {
  const { currentUser, userProfile } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    console.log('Initializing socket connection...');
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setSocket(newSocket);

      // Join with user data
      newSocket.emit('join', {
        uid: currentUser.uid,
        name: userProfile?.name
      });
      console.log('Joined with user data:', { uid: currentUser.uid, name: userProfile?.name });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      alert('Unable to connect to server. Please check if the server is running.');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for incoming calls
    newSocket.on('call:incoming', (data: IncomingCallData) => {
      console.log('Incoming call received:', data);
      setIncomingCall(data);
    });

    // Listen for call accepted
    newSocket.on('call:accepted', (data: { signal: any }) => {
      console.log('Call accepted');
      setCallAccepted(true);
      if (peer) {
        peer.signal(data.signal);
      }
    });

    // Listen for call rejected
    newSocket.on('call:rejected', () => {
      console.log('Call rejected');
      alert('Call was rejected by the recipient');
      endCall();
    });

    // Listen for call ended
    newSocket.on('call:ended', () => {
      console.log('Call ended by remote user');
      endCall();
    });

    // Listen for ICE candidates
    newSocket.on('ice-candidate', (data: { candidate: any }) => {
      console.log('ICE candidate received');
      if (peer) {
        peer.signal(data.candidate);
      }
    });

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [currentUser, userProfile?.name, peer]);

  const getUserMedia = async (video: boolean = true, audio: boolean = true) => {
    try {
      console.log('Requesting media access:', { video, audio });
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audio
      });
      
      console.log('Media stream obtained:', mediaStream);
      setStream(mediaStream);
      
      if (localVideoRef.current && video) {
        localVideoRef.current.srcObject = mediaStream;
        console.log('Local video set');
      }
      
      return mediaStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Provide user-friendly error messages
      const mediaError = error as DOMException;
      if (mediaError.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow access and try again.');
      } else if (mediaError.name === 'NotFoundError') {
        alert('No camera or microphone found. Please check your devices.');
      } else if (mediaError.name === 'NotReadableError') {
        alert('Camera/microphone is being used by another application.');
      } else {
        alert(`Error accessing media devices: ${mediaError.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  };

  const initiateCall = async (type: 'audio' | 'video') => {
    if (!currentUser || !socket) {
      console.error('Missing currentUser or socket');
      alert('Connection error. Please refresh the page and try again.');
      return;
    }

    try {
      console.log('Initiating call:', type);
      setCallType(type);
      setIsCallActive(true);
      setConnectionState('connecting');
      onCallStart?.();

      const mediaStream = await getUserMedia(type === 'video', true);
      
      const newPeer = new Peer({
        initiator: true,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      newPeer.on('signal', (signal) => {
        console.log('Sending call signal');
        socket.emit('call:initiate', {
          to: recipientId,
          from: currentUser.uid,
          signal,
          type,
          callerName: userProfile?.name || 'Unknown'
        });
      });

      newPeer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setConnectionState('connected');
      });

      newPeer.on('connect', () => {
        console.log('Peer connected');
        setConnectionState('connected');
      });

      newPeer.on('error', (error) => {
        console.error('Peer error:', error);
        alert(`Call failed: ${error.message}`);
        endCall();
      });

      setPeer(newPeer);
    } catch (error) {
      console.error('Error initiating call:', error);
      endCall();
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !currentUser || !socket) return;

    try {
      setIsCallActive(true);
      setCallType(incomingCall.type);
      setConnectionState('connecting');

      const mediaStream = await getUserMedia(incomingCall.type === 'video', true);
      
      const newPeer = new Peer({
        initiator: false,
        trickle: false,
        stream: mediaStream
      });

      newPeer.on('signal', (signal) => {
        socket.emit('call:answer', {
          to: incomingCall.from,
          signal
        });
      });

      newPeer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setConnectionState('connected');
      });

      newPeer.on('connect', () => {
        setConnectionState('connected');
      });

      newPeer.on('error', (error) => {
        console.error('Peer error:', error);
        endCall();
      });

      newPeer.signal(incomingCall.signal);
      setPeer(newPeer);
      setIncomingCall(null);
      setCallAccepted(true);
    } catch (error) {
      console.error('Error answering call:', error);
      rejectCall();
    }
  };

  const rejectCall = () => {
    if (!incomingCall || !socket) return;

    socket.emit('call:reject', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const endCall = () => {
    if (socket && recipientId) {
      socket.emit('call:end', { to: recipientId });
    }

    if (peer) {
      peer.destroy();
      setPeer(null);
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setIsCallActive(false);
    setCallAccepted(false);
    setIncomingCall(null);
    setConnectionState('disconnected');
    onCallEnd();
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Incoming call modal
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">
                {incomingCall.callerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Incoming {incomingCall.type} call</h3>
            <p className="text-gray-600 mb-6">{incomingCall.callerName} is calling you</p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={rejectCall}
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full"
              >
                <PhoneOff size={24} />
              </button>
              <button
                onClick={answerCall}
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full"
              >
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Call interface
  if (isCallActive) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{recipientName}</h2>
            <p className="text-sm text-gray-300">
              {connectionState === 'connecting' ? 'Connecting...' : 
               connectionState === 'connected' ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-300">{callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
          </div>
        </div>

        {/* Video area */}
        <div className="flex-1 relative">
          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Local video (Picture-in-Picture) */}
          {callType === 'video' && (
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Connection status overlay */}
          {connectionState === 'connecting' && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Connecting...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-6">
          <div className="flex justify-center space-x-4">
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full ${
                  isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                } text-white`}
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            )}
            
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full ${
                isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
              } text-white`}
            >
              {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            
            <button
              onClick={endCall}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Call initiation buttons
  return (
    <div className="flex space-x-2">
      <button
        onClick={() => initiateCall('audio')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Voice call"
      >
        <Phone size={20} className="text-gray-600" />
      </button>
      <button
        onClick={() => initiateCall('video')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Video call"
      >
        <Video size={20} className="text-gray-600" />
      </button>
    </div>
  );
} 