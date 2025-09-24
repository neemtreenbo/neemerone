// Debug utility for avatar upload troubleshooting
export function logAvatarDebug(context: string, data: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AVATAR DEBUG - ${context}]:`, data);
  }
}

export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Max: 5MB` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}