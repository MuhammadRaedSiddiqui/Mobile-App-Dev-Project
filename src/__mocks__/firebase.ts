// Mock for Firebase
export const initializeApp = jest.fn();
export const getApps = jest.fn(() => []);
export const getApp = jest.fn();

export const getAuth = jest.fn(() => ({
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

export const getFirestore = jest.fn(() => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

export const getStorage = jest.fn(() => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Auth exports
export * from 'firebase/auth';

// Firestore exports
export * from 'firebase/firestore';

// Storage exports
export * from 'firebase/storage';
