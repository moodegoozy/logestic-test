import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

const appCheckSiteKey =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  '6LdBkMgsAAAAAOjZO9ftgLwC8TQZV-khpQn3CfRc';

if (typeof window !== 'undefined' && appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = initializeFirestore(app, {}, 'default');
export const storage = getStorage(app);
export default app;
