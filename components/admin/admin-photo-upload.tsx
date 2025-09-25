'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface AdminPhotoUploadProps {
  onFileSelect: (file: File | null) => void;
  onPhotoRemove?: (photoUrl: string) => Promise<void>;
  initialPhotoUrl?: string;
  className?: string;
  disabled?: boolean;
}

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  previewUrl?: string;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function AdminPhotoUpload({ onFileSelect, onPhotoRemove, initialPhotoUrl, className, disabled }: AdminPhotoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null,
    previewUrl: initialPhotoUrl,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;

    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadState(prev => ({
          ...prev,
          error: 'File size must be less than 5MB'
        }));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setSelectedFile(file);
        setIsEditing(true);
        setUploadState(prev => ({ ...prev, error: null }));
      };
      reader.readAsDataURL(file);
    }
  }, [disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    disabled
  });

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  function getCroppedImg(): Promise<File | null> {
    return new Promise((resolve) => {
      if (!completedCrop || !imgRef.current || !canvasRef.current || !selectedFile) {
        resolve(null);
        return;
      }

      const image = imgRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height,
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], selectedFile.name, {
            type: selectedFile.type,
            lastModified: Date.now(),
          });
          resolve(croppedFile);
        } else {
          resolve(null);
        }
      }, selectedFile.type);
    });
  }

  const handleConfirmCrop = async () => {
    const croppedFile = await getCroppedImg();
    if (croppedFile) {
      onFileSelect(croppedFile);
      setUploadState(prev => ({
        ...prev,
        previewUrl: URL.createObjectURL(croppedFile)
      }));
    }
    setIsEditing(false);
  };

  const handleCancelCrop = () => {
    setIsEditing(false);
    setImageSrc('');
    setSelectedFile(null);
    setZoom(1);
  };

  const handleRemoveImage = async () => {
    // If there's an initial photo URL and onPhotoRemove callback, call it to delete from storage/database
    if (initialPhotoUrl && onPhotoRemove && !uploadState.previewUrl) {
      try {
        setUploadState(prev => ({ ...prev, isUploading: true }));
        await onPhotoRemove(initialPhotoUrl);
      } catch {
        setUploadState(prev => ({
          ...prev,
          error: 'Failed to remove photo',
          isUploading: false
        }));
        return;
      }
    }

    setImageSrc('');
    setSelectedFile(null);
    setIsEditing(false);
    setZoom(1);
    setUploadState(prev => ({
      ...prev,
      previewUrl: undefined,
      error: null,
      isUploading: false
    }));
    onFileSelect(null);
  };

  if (isEditing && imageSrc) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium">Edit advisor photo</h3>
              <p className="text-sm text-muted-foreground">
                Adjust the crop area and zoom to get the perfect photo
              </p>
            </div>

            <div className="relative max-w-md mx-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageSrc}
                  style={{
                    transform: `scale(${zoom})`,
                    maxHeight: '400px',
                    maxWidth: '100%'
                  }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoom(1)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={handleConfirmCrop}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelCrop}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>
    );
  }

  if (uploadState.previewUrl || initialPhotoUrl) {
    const displayUrl = uploadState.previewUrl || initialPhotoUrl;
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt="Advisor photo"
                className="w-full h-full rounded-full object-cover border-4 border-muted"
              />
            </div>
            <div>
              <p className="text-sm font-medium">
                {uploadState.previewUrl ? 'New photo selected' : 'Current photo'}
              </p>
              <div className="flex gap-2 justify-center mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={disabled || uploadState.isUploading}
                >
                  {uploadState.previewUrl ? 'Remove new photo' : 'Remove photo'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : disabled
              ? 'border-muted-foreground/25 cursor-not-allowed opacity-50'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop advisor photo here' : 'Upload advisor photo'}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag and drop or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or WebP (max 5MB)
            </p>
          </div>
        </div>
        {uploadState.error && (
          <p className="text-sm text-destructive mt-2">{uploadState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}