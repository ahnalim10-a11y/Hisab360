/**
 * Google Drive & Cloud integration stubs (Firebase Google Log-in is disabled)
 * All data is stored locally in the browser/device (LocalStorage & Offline Backup).
 */

import { FullAppBackup } from './pdfGenerator';

export interface MockUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const auth = null;
export const db = null;

export const initGoogleDriveAuth = (
  _onAuthSuccess?: (user: any, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthFailure) {
    onAuthFailure();
  }
  return () => {};
};

export const signInGoogleDrive = async (): Promise<null> => {
  console.info('Google Log-in is disabled. Data is kept locally and securely.');
  return null;
};

export const signOutGoogleDrive = async (): Promise<void> => {
  try {
    sessionStorage.removeItem('hk_drive_token');
  } catch {
    // ignore
  }
};

export const getDriveAccessToken = (): string | null => {
  return null;
};

export const getCurrentDriveUser = (): null => {
  return null;
};

export async function saveBackupToGoogleDrive(
  _backupData: FullAppBackup
): Promise<{ success: boolean; fileId: string; modifiedTime: string }> {
  return {
    success: false,
    fileId: '',
    modifiedTime: new Date().toISOString(),
  };
}

export async function uploadPdfToGoogleDrive(
  _fileName: string,
  _pdfBlob: Blob
): Promise<{ success: boolean; fileId: string; name: string; webViewLink?: string }> {
  throw new Error('গুগল লগইন বন্ধ রয়েছে। আপনি সরাসরি পিডিএফ ডাউনলোড অথবা শেয়ার বাটন ব্যবহার করতে পারেন।');
}

export async function loadBackupFromGoogleDrive(): Promise<FullAppBackup | null> {
  return null;
}
