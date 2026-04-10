import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBa72M5Id1bT2M1VYbS2LrH-npiJo0jpGo",
  authDomain: "sfrtalbyt-f7fd1.firebaseapp.com",
  projectId: "sfrtalbyt-f7fd1",
  storageBucket: "sfrtalbyt-f7fd1.firebasestorage.app",
  messagingSenderId: "45578115553",
  appId: "1:45578115553:web:82ca60bc772f2756261aa0",
  measurementId: "G-GFCWWEQ74L",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {}, 'default');
export default app;
