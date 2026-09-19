import React, { useState, useRef } from 'react';
import { Profile } from '../../types';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { supabase } from '../../lib/supabase'; // Adjust path to match your supabase client file
import {
  Upload,
  Camera,
  X,
  Check,
  Trash2,
  Sparkles,
  Link,
  Loader2,
} from 'lucide-react';

interface ChangeProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSaveAvatar: (profileId: string, avatarUrl: string | undefined) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
];

export const ChangeProfilePictureModal: React.FC<ChangeProfilePictureModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveAvatar,
}) => {
  if (!isOpen || !profile) return null;

  const [previewUrl, setPreviewUrl] = useState<string | undefined>(profile.avatarUrl);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload file directly to Supabase Storage Bucket
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, GIF)');
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // 2. Retrieve Public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPreviewUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image to Supabase Storage. Make sure the "avatars" bucket is created and set to Public.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setPreviewUrl(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleSave = () => {
    onSaveAvatar(profile.id, previewUrl);
    onClose();
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
  };

  const tempProfile: Profile = {
    ...profile,
    avatarUrl: previewUrl,
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">Change Profile Picture</h3>
              <p className="text-[11px] text-stone-500">Updating photo for {profile.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Avatar Preview */}
          <div className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl border border-stone-100">
            <div className="relative">
              <ProfileAvatar profile={tempProfile} size="xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-stone-900">{profile.name}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {previewUrl ? 'Custom photo selected' : 'Using default initials badge'}
              </p>
              {previewUrl && (
                <button
                  onClick={handleRemove}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove custom photo</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Upload from Device (Drag & Drop or Browse)
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-stone-200 hover:border-indigo-300 hover:bg-stone-50/60 bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-1">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-1.5" />
                  <p className="text-xs font-semibold text-stone-700">Uploading to Supabase...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-indigo-600 mb-1.5" />
                  <p className="text-xs font-medium text-stone-800">
                    <span className="text-indigo-600 font-semibold underline">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">PNG, JPG, WebP, GIF up to 5MB</p>
                </>
              )}
            </div>
          </div>

          {/* Quick Select Presets */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Or Choose a Preset Photo</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AVATARS.map((url, idx) => {
                const isSelected = previewUrl === url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewUrl(url)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-0.5 ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-400 scale-95'
                        : 'border-transparent hover:border-stone-300'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Preset ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Or enter Image URL */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1">
              <Link className="w-3.5 h-3.5 text-stone-400" />
              <span>Or Paste Image Link</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                disabled={!urlInput.trim()}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                Use
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
};