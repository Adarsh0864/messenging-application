'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Mic, MicOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function VideoCallDebug() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const getDeviceInfo = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      const info = `
        Video Devices: ${videoDevices.length}
        ${videoDevices.map((d, i) => `  ${i + 1}. ${d.label || 'Unknown Camera'}`).join('\n')}
        
        Audio Devices: ${audioDevices.length}
        ${audioDevices.map((d, i) => `  ${i + 1}. ${d.label || 'Unknown Microphone'}`).join('\n')}
        
        Permissions API: ${navigator.permissions ? 'Available' : 'Not Available'}
        MediaDevices API: ${navigator.mediaDevices ? 'Available' : 'Not Available'}
      `;
      
      setDeviceInfo(info);
    } catch (error) {
      console.error('Error getting device info:', error);
      setDeviceInfo('Error getting device information');
    }
  };

  const startVideo = async () => {
    try {
      console.log('🎬 Starting video test...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      console.log('✅ Media stream obtained:', mediaStream);
      console.log('📊 Video tracks:', mediaStream.getVideoTracks());
      console.log('🎵 Audio tracks:', mediaStream.getAudioTracks());

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded');
          console.log('📺 Video dimensions:', {
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight
          });
        };
        
        videoRef.current.onplay = () => {
          console.log('▶️ Video started playing');
        };

        await videoRef.current.play();
        toast.success('Video test started successfully!');
      }
    } catch (error) {
      console.error('❌ Error starting video:', error);
      const mediaError = error as DOMException;
      
      if (mediaError.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please allow camera access.');
      } else if (mediaError.name === 'NotFoundError') {
        toast.error('No camera found. Please check your camera connection.');
      } else {
        toast.error(`Video error: ${mediaError.message || 'Unknown error'}`);
      }
    }
  };

  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });
      setStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      toast.success('Video test stopped');
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`🎵 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  useEffect(() => {
    getDeviceInfo();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-md z-50">
      <h3 className="font-semibold mb-3">Video Call Debug</h3>
      
      {/* Video Preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-3" style={{ height: '150px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <p>No video stream</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={stream ? stopVideo : startVideo}
          className={`px-3 py-2 rounded text-sm ${
            stream 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {stream ? 'Stop Test' : 'Start Test'}
        </button>
        
        {stream && (
          <>
            <button
              onClick={toggleVideo}
              className={`p-2 rounded ${
                isVideoEnabled ? 'bg-gray-200' : 'bg-red-500 text-white'
              }`}
            >
              {isVideoEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
            </button>
            
            <button
              onClick={toggleAudio}
              className={`p-2 rounded ${
                isAudioEnabled ? 'bg-gray-200' : 'bg-red-500 text-white'
              }`}
            >
              {isAudioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
          </>
        )}
      </div>

      {/* Device Info */}
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">Device Info</summary>
        <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
          {deviceInfo}
        </pre>
      </details>
    </div>
  );
} 