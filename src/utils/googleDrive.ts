import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDocFromServer,
  collection,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { FullAppBackup } from './pdfGenerator';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore connection as required by firebase skill
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}
testFirestoreConnection();

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory + session storage token cache
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem('hk_drive_token');
  } catch {
    return null;
  }
})();

let isSigningIn = false;

export const initGoogleDriveAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        try {
          sessionStorage.removeItem('hk_drive_token');
        } catch {
          // ignore
        }
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const signInGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || '';
    if (token) {
      cachedAccessToken = token;
      try {
        sessionStorage.setItem('hk_drive_token', token);
      } catch {
        // ignore
      }
    }
    return { user: result.user, accessToken: token };
  } catch (error) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogleDrive = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('hk_drive_token');
  } catch {
    // ignore
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCurrentDriveUser = (): User | null => {
  return auth.currentUser;
};

const BACKUP_FILE_NAME = 'hisab_khata_backup.json';

/**
 * Searches for existing backup file in Google Drive created by this app
 */
async function findBackupFileId(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Drive list error: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Saves or updates application backup in Google Drive and syncs to Firestore
 */
export async function saveBackupToGoogleDrive(
  backupData: FullAppBackup
): Promise<{ success: boolean; fileId: string; modifiedTime: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive এ সাইন-ইন করা নেই');
  }

  // Also sync to Firestore for user if logged in
  if (auth.currentUser) {
    try {
      const user = auth.currentUser;
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || 'ahn.alim10@gmail.com',
          displayName: user.displayName || backupData.userProfile?.name || 'হিসাবাধিকারী',
          photoURL: user.photoURL || backupData.userProfile?.img || '',
          signatureUrl: backupData.userProfile?.signatureUrl || '',
          lastSynced: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Save backup snapshot to user's backups subcollection
      const backupDocRef = doc(collection(db, 'users', user.uid, 'backups'), 'latest');
      await setDoc(backupDocRef, {
        userId: user.uid,
        exportedAt: backupData.exportedAt || new Date().toISOString(),
        version: backupData.version || '1.0.0',
        payload: JSON.stringify(backupData),
        updatedAt: new Date().toISOString(),
      });
    } catch (firestoreErr) {
      console.warn('Firestore backup sync notice:', firestoreErr);
    }
  }

  const jsonContent = JSON.stringify(backupData, null, 2);
  const existingFileId = await findBackupFileId(token);

  if (existingFileId) {
    // Update existing file content
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonContent,
      }
    );

    if (!res.ok) {
      throw new Error(`Drive update error: ${res.statusText}`);
    }

    const updated = await res.json();
    return {
      success: true,
      fileId: existingFileId,
      modifiedTime: updated.modifiedTime || new Date().toISOString(),
    };
  } else {
    // Create new file via multipart upload
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: 'হিসাব খাতা অ্যাপের সংরক্ষিত স্বয়ংক্রিয় ব্যাকআপ ফাইল',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!res.ok) {
      throw new Error(`Drive create error: ${res.statusText}`);
    }

    const created = await res.json();
    return {
      success: true,
      fileId: created.id,
      modifiedTime: created.modifiedTime || new Date().toISOString(),
    };
  }
}

/**
 * Uploads a generated PDF Report blob directly to user's Google Drive
 */
export async function uploadPdfToGoogleDrive(
  fileName: string,
  pdfBlob: Blob
): Promise<{ success: boolean; fileId: string; name: string; webViewLink?: string }> {
  let token = getDriveAccessToken();
  if (!token) {
    const authRes = await signInGoogleDrive();
    if (!authRes?.accessToken) {
      throw new Error('গুগল ড্রাইভে আপলোড করতে প্রথমে গুগল দিয়ে সাইন-ইন সম্পন্ন করুন');
    }
    token = authRes.accessToken;
  }

  const finalName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const metadata = {
    name: finalName,
    mimeType: 'application/pdf',
    description: 'হিসাব খাতা অ্যাপ থেকে ডাউনলোড ও সংরক্ষিত আর্থিক হিসাবের রিপোর্ট',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const fileHeader = `${delimiter}Content-Type: application/pdf\r\n\r\n`;

  const multipartBlob = new Blob([metadataPart, fileHeader, pdfBlob, closeDelimiter], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: multipartBlob,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Google Drive PDF upload failed:', res.status, errorText);
    throw new Error(`গুগল ড্রাইভে আপলোড ব্যর্থ হয়েছে (${res.statusText})`);
  }

  const data = await res.json();
  return {
    success: true,
    fileId: data.id,
    name: data.name || finalName,
    webViewLink: data.webViewLink,
  };
}

/**
 * Loads latest backup from Google Drive
 */
export async function loadBackupFromGoogleDrive(): Promise<FullAppBackup | null> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive এ সাইন-ইন করা নেই');
  }

  const existingFileId = await findBackupFileId(token);
  if (!existingFileId) {
    return null;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Drive read error: ${res.statusText}`);
  }

  const data = await res.json();
  return data as FullAppBackup;
}

