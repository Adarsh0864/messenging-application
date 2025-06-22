import { toast } from 'react-hot-toast';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your-upload-preset';
// Note: API key not needed for unsigned uploads

export interface CloudinaryUploadProgress {
  progress: number;
  error?: string;
}

export interface CloudinaryUploadedFile {
  url: string;
  publicId: string;
  name: string;
  size: number;
  type: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  resourceType: 'image' | 'video' | 'raw' | 'auto';
}

// File validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/webm'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

export interface FileValidation {
  valid: boolean;
  error?: string;
}

export const validateFile = (file: File): FileValidation => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
    };
  }

  // Check file type
  const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
  if (!allAllowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported'
    };
  }

  return { valid: true };
};

export const getFileCategory = (fileType: string): 'image' | 'video' | 'document' => {
  if (ALLOWED_IMAGE_TYPES.includes(fileType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(fileType)) return 'video';
  return 'document';
};

export const getResourceType = (fileType: string): 'image' | 'video' | 'raw' | 'auto' => {
  if (ALLOWED_IMAGE_TYPES.includes(fileType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(fileType)) return 'video';
  return 'raw'; // For documents and other files
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const uploadToCloudinary = (
  file: File,
  userId: string,
  onProgress?: (progress: CloudinaryUploadProgress) => void
): Promise<CloudinaryUploadedFile> => {
  return new Promise((resolve, reject) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    // Note: cloud_name is not needed in form data, it's in the URL
    // Note: API key is not needed for unsigned uploads
    
    // Add folder structure for organization
    const category = getFileCategory(file.type);
    const folder = `chat_files/${userId}/${category}`;
    formData.append('folder', folder);
    
    // Add tags for better organization
    formData.append('tags', `chat,${category},user_${userId}`);
    
    // Set resource type
    const resourceType = getResourceType(file.type);
    
    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress?.({ progress });
      }
    });
    
    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          
          const uploadedFile: CloudinaryUploadedFile = {
            url: response.secure_url,
            publicId: response.public_id,
            name: file.name,
            size: file.size,
            type: file.type,
            format: response.format,
            resourceType,
            // Only include optional fields if they have values
            ...(response.width && { width: response.width }),
            ...(response.height && { height: response.height }),
            ...(response.duration && { duration: response.duration })
          };
          
          console.log('Cloudinary upload successful:', uploadedFile);
          resolve(uploadedFile);
        } catch (error) {
          console.error('Error parsing Cloudinary response:', error);
          onProgress?.({ progress: 0, error: 'Upload failed - invalid response' });
          reject(new Error('Upload failed - invalid response'));
        }
      } else {
        console.error('Cloudinary upload failed:', xhr.status, xhr.responseText);
        onProgress?.({ progress: 0, error: `Upload failed - ${xhr.status}` });
        reject(new Error(`Upload failed - ${xhr.status}`));
      }
    });
    
    // Handle errors
    xhr.addEventListener('error', () => {
      console.error('Cloudinary upload error:', xhr.statusText);
      onProgress?.({ progress: 0, error: 'Upload failed - network error' });
      reject(new Error('Upload failed - network error'));
    });
    
    // Start upload
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
};

// Helper function to get optimized image URL
export const getOptimizedImageUrl = (
  publicId: string, 
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string => {
  const { width, height, quality = 'auto', format = 'auto' } = options;
  
  let transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  
  const transformationString = transformations.length > 0 ? `/${transformations.join(',')}` : '';
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload${transformationString}/${publicId}`;
};

// Helper function to get video thumbnail
export const getVideoThumbnail = (publicId: string, options: { width?: number; height?: number } = {}): string => {
  const { width = 300, height = 200 } = options;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/w_${width},h_${height},c_fill,f_jpg,q_auto/${publicId}.jpg`;
};

// Helper function to delete file from Cloudinary (for cleanup)
export const deleteFromCloudinary = async (publicId: string, resourceType: string = 'image'): Promise<boolean> => {
  try {
    // Note: For security, deletion should typically be done on the backend
    // This is a placeholder for the frontend implementation
    console.log('Delete request for:', publicId);
    
    // In a real implementation, you'd call your backend API
    // which would handle the deletion using Cloudinary's Admin API
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId, resourceType }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
}; 