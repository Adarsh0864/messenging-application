'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from './SocketProvider';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  const { socket, isConnected } = useSocket();
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'ringing' | 'connected' | 'disconnected'>('connecting');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [pendingIceCandidates, setPendingIceCandidates] = useState<any[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const isAnsweringCall = useRef(false);
  const currentStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!currentUser || !socket) return;

    console.log('Setting up call listeners on existing socket');

    // Join with user data when socket is available
    const userName = userProfile?.name || currentUser?.email?.split('@')[0] || 'Anonymous User';
    socket.emit('join', {
      uid: currentUser.uid,
      name: userName
    });
    console.log('Joined with user data:', { uid: currentUser.uid, name: userName });

    // Listen for incoming calls
    const handleIncomingCall = (data: IncomingCallData) => {
      console.log('Incoming call received:', data);
      if (!isEndingCall) {
        setIncomingCall(data);
        // Clear any pending ICE candidates from previous calls
        setPendingIceCandidates([]);
      }
    };

    // Listen for call accepted
    const handleCallAccepted = (data: { signal: any }) => {
      console.log('📞 Call accepted by remote user');
      if (!isEndingCall && peerRef.current) {
        try {
          console.log('📡 Processing call accepted signal...');
          peerRef.current.signal(data.signal);
          setCallAccepted(true); // Set call as accepted
          setConnectionState('connecting'); // Update connection state
          
          // Process any pending ICE candidates after peer is ready
          if (pendingIceCandidates.length > 0) {
            console.log(`📦 Processing ${pendingIceCandidates.length} pending ICE candidates after acceptance`);
            pendingIceCandidates.forEach(candidate => {
              if (peerRef.current) {
                try {
                  peerRef.current.signal(candidate);
                } catch (error) {
                  console.error('Error processing pending ICE candidate:', error);
                }
              }
            });
            setPendingIceCandidates([]);
          }
          
          console.log('✅ Call accepted signal processed successfully');
        } catch (error) {
          console.error('❌ Error processing call accepted signal:', error);
        }
      }
    };

    // Listen for call rejected
    const handleCallRejected = () => {
      console.log('Call rejected');
      if (!isEndingCall) {
        toast.error('Call was rejected by the recipient');
        endCall();
      }
    };

    // FIXED: Prevent infinite loop in call ended handler
    const handleCallEnded = () => {
      console.log('Call ended by remote user');
      if (!isEndingCall && !isReconnecting) {
        toast('Call ended by the other person');
        endCall();
      }
    };

    // Listen for call ringing
    const handleCallRinging = (data: { to: string }) => {
      console.log('Call is ringing:', data.to);
      if (!isEndingCall) {
        setConnectionState('ringing');
      }
    };

    // IMPROVED: Better user unavailable handling
    const handleUserUnavailable = (data: { message: string }) => {
      console.log('User unavailable:', data.message);
      if (isEndingCall) return;
      
      if (connectionAttempts < 3) {
        console.log('Retrying connection...');
        setConnectionAttempts(prev => prev + 1);
        toast(`Connection issue, retrying... (${connectionAttempts + 1}/3)`);
        setTimeout(() => {
          if (socket && recipientId && !isEndingCall) {
            socket.emit('call:check-user', { targetId: recipientId });
          }
        }, 2000);
      } else {
        toast.error(data.message);
        endCall();
      }
    };

    // CRITICAL FIX: ICE candidate handling with proper storage
    const handleIceCandidate = (data: { candidate: any }) => {
      console.log('ICE candidate received:', data.candidate);
      if (isEndingCall) return;
      
      if (peerRef.current && !isAnsweringCall.current) {
        try {
          console.log('Adding ICE candidate to existing peer');
          peerRef.current.signal(data.candidate);
        } catch (error) {
          console.error('Error adding ICE candidate to peer:', error);
        }
      } else {
        console.log('Storing ICE candidate for later - peer not ready yet');
        setPendingIceCandidates(prev => [...prev, data.candidate]);
      }
    };

    // NEW: Handle connection recovery
    const handleConnectionRecovery = () => {
      console.log('Connection recovery signal received');
      if (isCallActive && connectionState === 'disconnected' && !isEndingCall) {
        console.log('Attempting to recover call connection...');
        setIsReconnecting(true);
        toast('Reconnecting call...');
        setTimeout(() => {
          if (!isEndingCall) {
            setIsReconnecting(false);
            setConnectionState('connecting');
          }
        }, 1000);
      }
    };

    // Add event listeners
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:ringing', handleCallRinging);
    socket.on('call:user-unavailable', handleUserUnavailable);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('connection:recovered', handleConnectionRecovery);

    return () => {
      console.log('Cleaning up call event listeners');
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:ringing', handleCallRinging);
      socket.off('call:user-unavailable', handleUserUnavailable);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('connection:recovered', handleConnectionRecovery);
    };
  }, [currentUser?.uid, userProfile?.name, socket, isReconnecting, isCallActive, connectionState, connectionAttempts, isEndingCall, pendingIceCandidates]);

  // CRITICAL FIX: Only cleanup on actual component unmount, not state changes
  useEffect(() => {
    return () => {
      console.log('CallInterface component unmounting, performing cleanup');
      
      // Always clean up on unmount (this is final cleanup)
      console.log('Final component unmount - cleaning up all resources');
      
      // Clear timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionMonitorRef.current) {
        clearInterval(connectionMonitorRef.current);
      }
      
      // Stop media streams
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.log('Error stopping track during final unmount:', error);
          }
        });
      }
      
      // Destroy peer connection
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (error) {
          console.log('Error destroying peer during final unmount:', error);
        }
      }
    };
  }, []); // CRITICAL: Empty dependency array - only run on actual unmount

  const getUserMedia = async (video: boolean = true, audio: boolean = true) => {
    try {
      console.log('Requesting media access:', { video, audio });
      
      const constraints: MediaStreamConstraints = {
        video: video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Media stream obtained:', mediaStream);
      console.log('Stream tracks:', mediaStream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState
      })));
      
      setStream(mediaStream);
      currentStreamRef.current = mediaStream; // Keep ref for cleanup
      
      if (localVideoRef.current && video) {
        console.log('📹 Setting up local video');
        localVideoRef.current.srcObject = mediaStream;
        localVideoRef.current.autoplay = true;
        localVideoRef.current.playsInline = true;
        localVideoRef.current.muted = true; // Always mute local video to prevent feedback
        
        localVideoRef.current.onloadedmetadata = () => {
          console.log('✅ Local video metadata loaded');
        };
        
        localVideoRef.current.oncanplay = () => {
          console.log('✅ Local video can play');
        };
        
        try {
          await localVideoRef.current.play();
          console.log('✅ Local video playing successfully');
        } catch (e) {
          console.error('❌ Error playing local video:', e);
        }
        
        console.log('📺 Local video configured');
      }
      
      return mediaStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Provide user-friendly error messages
      const mediaError = error as DOMException;
      if (mediaError.name === 'NotAllowedError') {
        toast.error('Camera/microphone access denied. Please allow access and try again.');
      } else if (mediaError.name === 'NotFoundError') {
        toast.error('No camera or microphone found. Please check your devices.');
      } else if (mediaError.name === 'NotReadableError') {
        toast.error('Camera/microphone is being used by another application.');
      } else {
        toast.error(`Error accessing media devices: ${mediaError.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  };

  const createPeerConnection = (initiator: boolean, mediaStream: MediaStream) => {
    console.log(`Creating peer connection (initiator: ${initiator})`);
    
    const peerConfig = {
      initiator,
      trickle: true,
      stream: mediaStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Add more STUN servers for better connectivity
          { urls: 'stun:stun.stunprotocol.org:3478' },
          { urls: 'stun:stun.services.mozilla.com:3478' }
        ],
        iceCandidatePoolSize: 10,
        // Additional configuration for better video streaming
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        bundlePolicy: 'max-bundle' as RTCBundlePolicy,
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
      }
    };
    
    console.log('Peer config:', peerConfig);
    console.log('Media stream tracks:', mediaStream.getTracks().map(t => ({
      kind: t.kind,
      label: t.label,
      enabled: t.enabled,
      readyState: t.readyState,
      id: t.id
    })));
    
    const newPeer = new Peer(peerConfig);

    newPeer.on('signal', (signal) => {
      console.log('Peer signal generated:', signal.type || 'candidate');
      
      if (signal.type === 'offer') {
        const userName = userProfile?.name || currentUser?.email?.split('@')[0] || 'Anonymous User';
        socket?.emit('call:initiate', {
          to: recipientId,
          from: currentUser?.uid,
          signal,
          type: callType,
          callerName: userName
        });
      } else if (signal.type === 'answer') {
        socket?.emit('call:answer', {
          to: incomingCall?.from,
          signal
        });
      } else if ('candidate' in signal) {
        const targetId = initiator ? recipientId : incomingCall?.from;
        socket?.emit('ice-candidate', {
          to: targetId,
          candidate: signal
        });
      }
    });

    newPeer.on('stream', (remoteStream) => {
      console.log('🎥 Received remote stream:', remoteStream);
      console.log('📊 Remote stream tracks:', remoteStream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        id: t.id
      })));
      
      // Verify we have video tracks
      const videoTracks = remoteStream.getVideoTracks();
      const audioTracks = remoteStream.getAudioTracks();
      
      console.log(`📹 Remote video tracks count: ${videoTracks.length}`);
      console.log(`🔊 Remote audio tracks count: ${audioTracks.length}`);
      
      if (videoTracks.length === 0) {
        console.warn('⚠️ No video tracks in remote stream!');
      }
      
      if (remoteVideoRef.current) {
        console.log('🖥️ Setting remote video srcObject');
        
        // Clear any existing stream first
        if (remoteVideoRef.current.srcObject) {
          const existingStream = remoteVideoRef.current.srcObject as MediaStream;
          existingStream.getTracks().forEach(track => track.stop());
        }
        
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.autoplay = true;
        remoteVideoRef.current.playsInline = true;
        remoteVideoRef.current.muted = false;
        
        // Add more comprehensive event listeners
        remoteVideoRef.current.onloadstart = () => {
          console.log('📺 Remote video load started');
        };
        
        remoteVideoRef.current.onloadeddata = () => {
          console.log('📺 Remote video data loaded');
        };
        
        remoteVideoRef.current.onloadedmetadata = () => {
          console.log('✅ Remote video metadata loaded:', {
            videoWidth: remoteVideoRef.current?.videoWidth,
            videoHeight: remoteVideoRef.current?.videoHeight,
            duration: remoteVideoRef.current?.duration
          });
        };
        
        remoteVideoRef.current.oncanplay = () => {
          console.log('✅ Remote video can play');
          // Force play when ready
          remoteVideoRef.current?.play().catch(e => {
            console.error('❌ Error auto-playing remote video:', e);
          });
        };
        
        remoteVideoRef.current.onplay = () => {
          console.log('▶️ Remote video started playing');
          setConnectionState('connected');
          setHasRemoteVideo(true);
          toast.success('Video call connected - can see remote video!');
        };
        
        remoteVideoRef.current.onpause = () => {
          console.log('⏸️ Remote video paused');
        };
        
        remoteVideoRef.current.onerror = (e) => {
          console.error('❌ Remote video error:', e);
        };
        
        remoteVideoRef.current.onstalled = () => {
          console.warn('⚠️ Remote video stalled');
        };
        
        remoteVideoRef.current.onwaiting = () => {
          console.log('⏳ Remote video waiting for data');
        };
        
        // Force initial play attempt
        setTimeout(() => {
          if (remoteVideoRef.current) {
            console.log('🎬 Attempting to play remote video...');
            remoteVideoRef.current.play().then(() => {
              console.log('✅ Remote video play() succeeded');
            }).catch(e => {
              console.error('❌ Error playing remote video:', e);
              // Try clicking to enable autoplay
              console.log('💡 Video autoplay blocked - user interaction may be required');
            });
          }
        }, 100);
        
        // Monitor video element status
        const monitorVideo = () => {
          if (remoteVideoRef.current) {
            console.log('📊 Remote video status:', {
              srcObject: !!remoteVideoRef.current.srcObject,
              videoWidth: remoteVideoRef.current.videoWidth,
              videoHeight: remoteVideoRef.current.videoHeight,
              readyState: remoteVideoRef.current.readyState,
              paused: remoteVideoRef.current.paused,
              ended: remoteVideoRef.current.ended,
              currentTime: remoteVideoRef.current.currentTime,
              muted: remoteVideoRef.current.muted
            });
          }
        };
        
        // Monitor every 2 seconds
        const monitor = setInterval(monitorVideo, 2000);
        setTimeout(() => clearInterval(monitor), 10000); // Stop monitoring after 10 seconds
        
      } else {
        console.error('❌ Remote video ref is null');
      }
    });

    newPeer.on('connect', () => {
      console.log('✅ Peer connection established');
      setConnectionState('connected');
      setConnectionAttempts(0); // Reset connection attempts on successful connection
      setIsReconnecting(false);
      
      // Start connection monitoring
      startConnectionMonitoring(newPeer);
    });

    newPeer.on('data', (data) => {
      console.log('📨 Peer data received:', data);
    });

    newPeer.on('close', () => {
      console.log('🔒 Peer connection closed');
      setConnectionState('disconnected');
      
      // Don't auto-end if we're already handling reconnection
      if (!isReconnecting && isCallActive) {
        console.log('🔄 Attempting to reconnect...');
        attemptReconnection();
      }
    });

    newPeer.on('error', (error) => {
      console.error('❌ Peer error:', error);
      
      // Handle different types of errors differently
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('Ice connection failed') || 
          errorMessage.includes('connection failed') ||
          errorMessage.includes('ice timeout')) {
        console.log('🔄 ICE connection failed, attempting reconnection...');
                 toast('Connection issue detected, reconnecting...');
        attemptReconnection();
      } else if (errorMessage.includes('Permission denied') || 
                 errorMessage.includes('NotAllowedError')) {
        toast.error('Camera/microphone permission denied');
        endCall();
      } else {
        console.log('🔄 Peer error occurred, attempting recovery...');
                 toast('Connection error, trying to recover...');
        attemptReconnection();
      }
    });

    // Monitor peer connection state
    setTimeout(() => {
      try {
        const pc = (newPeer as any)._pc;
        if (pc) {
          console.log('🔍 Peer connection state:', pc.connectionState);
          console.log('🔍 ICE connection state:', pc.iceConnectionState);
          console.log('🔍 ICE gathering state:', pc.iceGatheringState);
          console.log('🔍 Signaling state:', pc.signalingState);
          
          // Add connection state change listeners
          pc.onconnectionstatechange = () => {
            console.log('🔄 Connection state changed:', pc.connectionState);
            
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              console.log('🚨 Connection failed/disconnected, attempting recovery...');
              if (!isReconnecting) {
                attemptReconnection();
              }
            } else if (pc.connectionState === 'connected') {
              console.log('✅ Peer connection recovered');
              setConnectionState('connected');
              setIsReconnecting(false);
              setConnectionAttempts(0);
                             toast('Connection restored!');
            }
          };
          
          pc.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state changed:', pc.iceConnectionState);
            
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
              console.log('🚨 ICE connection failed, attempting recovery...');
              if (!isReconnecting) {
                attemptReconnection();
              }
            } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
              console.log('✅ ICE connection established');
              setConnectionState('connected');
              setIsReconnecting(false);
            }
          };
          
          const senders = pc.getSenders();
          console.log('📤 Local senders:', senders.length);
          senders.forEach((sender: any, index: number) => {
            if (sender.track) {
              console.log(`📤 Sender ${index}:`, {
                kind: sender.track.kind,
                enabled: sender.track.enabled,
                readyState: sender.track.readyState,
                label: sender.track.label
              });
            }
          });
          
          const receivers = pc.getReceivers();
          console.log('📥 Remote receivers:', receivers.length);
          receivers.forEach((receiver: any, index: number) => {
            if (receiver.track) {
              console.log(`📥 Receiver ${index}:`, {
                kind: receiver.track.kind,
                enabled: receiver.track.enabled,
                readyState: receiver.track.readyState,
                label: receiver.track.label
              });
            }
          });
        }
      } catch (error) {
        console.log('Error monitoring peer connection:', error);
      }
    }, 2000);

    return newPeer;
  };

  const initiateCall = async (type: 'audio' | 'video') => {
    if (!currentUser || !socket || !isConnected) {
      console.error('Missing currentUser, socket, or not connected');
      toast.error('Cannot make calls - please check your connection and try again.');
      return;
    }

    try {
      console.log('Initiating call:', type);
      setCallType(type);
      setIsCallActive(true);
      setConnectionState('connecting');
      onCallStart?.();

      const mediaStream = await getUserMedia(type === 'video', true);
      const newPeer = createPeerConnection(true, mediaStream);
      
      setPeer(newPeer);
      peerRef.current = newPeer;
      
    } catch (error) {
      console.error('Error initiating call:', error);
      endCall();
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !currentUser || !socket) return;

    try {
      console.log('📞 Answering call - starting setup...');
      isAnsweringCall.current = true; // Prevent cleanup during setup
      
      setIsCallActive(true);
      setCallType(incomingCall.type);
      setConnectionState('connecting');

      // Clear any existing call state
      setCallAccepted(false);
      
      console.log('🎥 Getting user media for call answer...');
      const mediaStream = await getUserMedia(incomingCall.type === 'video', true);
      
      console.log('🔗 Creating peer connection for call answer...');
      const newPeer = createPeerConnection(false, mediaStream);
      
      // Set peer BEFORE signaling to ensure ICE candidates can be processed
      setPeer(newPeer);
      peerRef.current = newPeer;
      
      console.log('📡 Signaling incoming call offer...');
      newPeer.signal(incomingCall.signal);
      
      // Process any pending ICE candidates that arrived before peer was ready
      if (pendingIceCandidates.length > 0) {
        console.log(`📦 Processing ${pendingIceCandidates.length} pending ICE candidates`);
        pendingIceCandidates.forEach(candidate => {
          try {
            newPeer.signal(candidate);
          } catch (error) {
            console.error('Error processing pending ICE candidate during answer:', error);
          }
        });
        setPendingIceCandidates([]);
      }
      
      setIncomingCall(null);
      setCallAccepted(true);
      isAnsweringCall.current = false; // Setup complete
      
      console.log('✅ Call answer setup complete');
      
    } catch (error) {
      console.error('❌ Error answering call:', error);
      isAnsweringCall.current = false;
      rejectCall();
    }
  };

  const rejectCall = () => {
    if (!incomingCall || !socket) return;

    socket.emit('call:reject', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const endCall = () => {
    // CRITICAL: Prevent infinite loop by checking if already ending
    if (isEndingCall) {
      console.log('Already ending call, ignoring duplicate endCall request');
      return;
    }
    
    console.log('Ending call...');
    setIsEndingCall(true); // Set flag immediately to prevent re-entrance
    
    // IMMEDIATELY remove event listeners to prevent further events
    if (socket) {
      console.log('Removing socket event listeners to prevent loops');
      socket.off('call:ended');
      socket.off('call:rejected');
      socket.off('call:user-unavailable');
      socket.off('ice-candidate');
      socket.off('connection:recovered');
    }
    
    // Clear all timers and monitoring
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
    
    // Only emit call:end if we haven't already and if call is actually active
    if (socket && (recipientId || incomingCall?.from) && isCallActive) {
      const targetId = recipientId || incomingCall?.from;
      console.log('Emitting call:end to', targetId);
      socket.emit('call:end', { to: targetId });
    }

    if (peer) {
      console.log('Destroying peer connection');
      try {
        peer.destroy();
      } catch (error) {
        console.log('Error destroying peer:', error);
      }
      setPeer(null);
      peerRef.current = null;
    }

    if (stream) {
      console.log('Stopping media stream');
      stream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log(`Stopped ${track.kind} track:`, track.label);
        } catch (error) {
          console.log(`Error stopping ${track.kind} track:`, error);
        }
      });
      setStream(null);
      currentStreamRef.current = null; // Clear ref
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Reset all state
    setIsCallActive(false);
    setCallAccepted(false);
    setIncomingCall(null);
    setConnectionState('disconnected');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setHasRemoteVideo(false);
    setConnectionAttempts(0);
    setIsReconnecting(false);
    setPendingIceCandidates([]); // Clear pending ICE candidates
    isAnsweringCall.current = false; // Reset answering flag
    
    // Call the parent callback
    onCallEnd();
    
    console.log('Call ended and cleaned up');
    
    // Reset the ending flag after a brief delay to allow cleanup to complete
    setTimeout(() => {
      setIsEndingCall(false);
    }, 1000);
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video toggled:', videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled:', audioTrack.enabled);
      }
    }
  };

  // NEW: Connection monitoring function
  const startConnectionMonitoring = (peer: Peer.Instance) => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }
    
    connectionMonitorRef.current = setInterval(() => {
      try {
        const pc = (peer as any)._pc;
        if (pc) {
          const connectionState = pc.connectionState;
          const iceConnectionState = pc.iceConnectionState;
          
          console.log('🔍 Connection health check:', {
            connection: connectionState,
            ice: iceConnectionState,
            signaling: pc.signalingState
          });
          
          // If connection is degraded for too long, attempt recovery
          if ((connectionState === 'failed' || iceConnectionState === 'failed') && !isReconnecting) {
            console.log('🚨 Connection health check failed, initiating recovery...');
            attemptReconnection();
          }
        }
      } catch (error) {
        console.log('Error in connection monitoring:', error);
      }
    }, 5000); // Check every 5 seconds
  };

  // NEW: Attempt reconnection function
  const attemptReconnection = () => {
    if (isReconnecting || connectionAttempts >= 3) {
      console.log('Already reconnecting or max attempts reached');
      return;
    }
    
    setIsReconnecting(true);
    setConnectionAttempts(prev => prev + 1);
    
    console.log(`🔄 Attempting reconnection ${connectionAttempts + 1}/3...`);
    toast(`Reconnecting... (${connectionAttempts + 1}/3)`);
    
    // Clear existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (socket && currentUser && (recipientId || incomingCall?.from)) {
          const targetId = recipientId || incomingCall?.from;
          
          // Check if user is still available
          console.log('🔍 Checking user availability for reconnection...');
          socket.emit('call:check-user', { targetId });
          
          // Emit reconnection signal
          socket.emit('call:reconnect', {
            to: targetId,
            from: currentUser.uid
          });
          
          // Reset reconnection state after attempt
          setTimeout(() => {
            if (isReconnecting) {
              setIsReconnecting(false);
              if (connectionAttempts >= 3) {
                console.log('❌ Max reconnection attempts reached');
                toast.error('Unable to restore connection. Call ended.');
                endCall();
              }
            }
          }, 10000); // 10 second timeout for reconnection
        }
      } catch (error) {
        console.error('Error during reconnection attempt:', error);
        setIsReconnecting(false);
      }
    }, 2000); // Wait 2 seconds before attempting reconnection
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
              {connectionState === 'connecting' ? 'Calling...' : 
               connectionState === 'ringing' ? 'Ringing...' :
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
            muted={false}
            controls={false}
            className="w-full h-full object-cover cursor-pointer"
            style={{ backgroundColor: '#000' }}
            onClick={() => {
              // Handle click to enable autoplay if blocked
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play().catch(e => {
                  console.error('Error playing video on click:', e);
                });
              }
            }}
          />
          
          {/* No video overlay */}
          {callType === 'video' && connectionState === 'connected' && !hasRemoteVideo && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-center pointer-events-none">
              <div className="bg-black bg-opacity-50 p-6 rounded-lg max-w-md">
                <p className="text-lg mb-2">Waiting for remote video...</p>
                <p className="text-sm text-gray-300">
                  If you can't see the other person's video, they may need to enable their camera or you may need to click on the video area.
                </p>
              </div>
            </div>
          )}

          {/* Local video (Picture-in-Picture) */}
          {callType === 'video' && (
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                You
              </div>
            </div>
          )}

          {/* Connection status overlay */}
          {(connectionState === 'connecting' || connectionState === 'ringing') && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>
                  {connectionState === 'connecting' ? 'Calling...' : 
                   connectionState === 'ringing' ? 'Ringing...' : 'Connecting...'}
                </p>
              </div>
            </div>
          )}

          {/* Fixed Position Controls */}
          <div 
            className="fixed z-20" 
            style={{
              bottom: '8vh',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-black bg-opacity-60 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border border-white border-opacity-20">
              <div className="flex items-center justify-center gap-5">
                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${
                      isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    } text-white shadow-lg hover:shadow-xl`}
                    title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    style={{ width: '60px', height: '60px' }}
                  >
                    {isVideoEnabled ? (
                      <Video size={24} />
                    ) : (
                      <VideoOff size={24} />
                    )}
                  </button>
                )}
                
                <button
                  onClick={toggleAudio}
                  className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${
                    isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                  } text-white shadow-lg hover:shadow-xl`}
                  title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  style={{ width: '60px', height: '60px' }}
                >
                  {isAudioEnabled ? (
                    <Mic size={24} />
                  ) : (
                    <MicOff size={24} />
                  )}
                </button>
                
                <button
                  onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  title="End call"
                  style={{ width: '60px', height: '60px' }}
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            </div>
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
        disabled={!isConnected}
        className={`p-2 rounded-full transition-colors ${
          isConnected 
            ? 'hover:bg-gray-100 text-gray-600' 
            : 'cursor-not-allowed text-gray-400'
        }`}
        title={isConnected ? "Voice call" : "Voice call unavailable - connection needed"}
      >
        <Phone size={20} />
      </button>
      <button
        onClick={() => initiateCall('video')}
        disabled={!isConnected}
        className={`p-2 rounded-full transition-colors ${
          isConnected 
            ? 'hover:bg-gray-100 text-gray-600' 
            : 'cursor-not-allowed text-gray-400'
        }`}
        title={isConnected ? "Video call" : "Video call unavailable - connection needed"}
      >
        <Video size={20} />
      </button>
    </div>
  );
} 