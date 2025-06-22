import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface FileUploadProgress {
  progress: number;
  url?: string;
  error?: string;
}

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

export const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  videos: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const getFileCategory = (fileType: string): 'image' | 'video' | 'document' | 'unknown' => {
  if (SUPPORTED_FILE_TYPES.images.includes(fileType)) return 'image';
  if (SUPPORTED_FILE_TYPES.videos.includes(fileType)) return 'video';
  if (SUPPORTED_FILE_TYPES.documents.includes(fileType)) return 'document';
  return 'unknown';
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  const allSupportedTypes = [
    ...SUPPORTED_FILE_TYPES.images,
    ...SUPPORTED_FILE_TYPES.videos,
    ...SUPPORTED_FILE_TYPES.documents
  ];

  if (!allSupportedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
};

export const uploadFile = (
  file: File,
  userId: string,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    console.log('Starting file upload:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      userId
    });

    const validation = validateFile(file);
    if (!validation.valid) {
      console.error('File validation failed:', validation.error);
      reject(new Error(validation.error));
      return;
    }

    const fileCategory = getFileCategory(file.type);
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `chat_files/${userId}/${fileCategory}s/${fileName}`;
    
    console.log('Upload path:', filePath);
    console.log('File category:', fileCategory);
    
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
        onProgress?.({ progress });
      },
      (error) => {
        console.error('Upload error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        onProgress?.({ progress: 0, error: error.message });
        reject(error);
      },
      async () => {
        try {
          console.log('Upload completed, getting download URL...');
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Download URL obtained:', downloadURL);
          
          const uploadedFile: UploadedFile = {
            url: downloadURL,
            name: file.name,
            size: file.size,
            type: file.type
          };
          
          onProgress?.({ progress: 100, url: downloadURL });
          resolve(uploadedFile);
        } catch (error) {
          console.error('Error getting download URL:', error);
          reject(error);
        }
      }
    );
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 