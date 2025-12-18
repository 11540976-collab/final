import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

declare const process: any;

// --- 設定說明 ---
// 若您不希望使用 GitHub Secrets 管理 Firebase 設定，請直接將 Firebase Console 提供的設定物件
// 填入下方的 `MANUAL_FIREBASE_CONFIG` 變數中。

const MANUAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDDbtwqxXogoyRmWXPsIVuWPaZMlA9fUyQ",
  authDomain: "final-cdb13.firebaseapp.com",
  projectId: "final-cdb13",
  storageBucket: "final-cdb13.firebasestorage.app",
  messagingSenderId: "646288625760",
  appId: "1:646288625760:web:cf74187f1d8d2a7b46f305"
};

// ----------------

let app: firebase.app.App | null = null;
let auth: firebase.auth.Auth | null = null;
let db: Firestore | null = null;
let isFirebaseInitialized = false;

// 優先順序：
// 1. 環境變數 (GitHub Secrets)
// 2. 手動設定 (MANUAL_FIREBASE_CONFIG)
// 3. 無設定 (進入展示模式)

let configToUse = null;

try {
    const envConfig = process.env.FIREBASE_CONFIG;
    if (envConfig && envConfig !== 'undefined') {
        configToUse = JSON.parse(envConfig);
    } else if (MANUAL_FIREBASE_CONFIG) {
        configToUse = MANUAL_FIREBASE_CONFIG;
    }

    if (configToUse) {
        // Use compat initialization to support auth compatibility
        app = firebase.initializeApp(configToUse);
        auth = app.auth();
        // Use modular firestore with compat app
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("Firebase initialized successfully.");
    } else {
        console.warn("No Firebase configuration found. App will default to Demo Mode.");
    }
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

export { auth, db, isFirebaseInitialized };