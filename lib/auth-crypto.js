import bcrypt from 'bcryptjs';

// Hash PIN/Password sebelum disimpan ke DB
export const hashPin = async (plainPin) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPin, salt);
};

// Verifikasi PIN/Password
export const comparePin = async (plainPin, hashedPin) => {
  if (!hashedPin) return false;
  
  // Mendukung fallback jika data di DB masih berupa teks biasa (plaintext)
  if (!hashedPin.startsWith('$2a$') && !hashedPin.startsWith('$2b$')) {
    return plainPin === hashedPin;
  }

  return await bcrypt.compare(plainPin, hashedPin);
};
