// Firebase Configuration
// Get these values from: https://console.firebase.google.com
// Project Settings > General > Your apps > Firebase SDK snippet

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase (singleton pattern for Next.js)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rtdb: Database;
let storage: FirebaseStorage;

function initializeFirebase() {
    if (typeof window === "undefined") {
        // Server-side: return null or basic config
        return null;
    }

    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        rtdb = getDatabase(app);
        storage = getStorage(app);
    } else {
        app = getApps()[0];
        auth = getAuth(app);
        db = getFirestore(app);
        rtdb = getDatabase(app);
        storage = getStorage(app);
    }

    return { app, auth, db, rtdb, storage };
}

// Export initialized instances
export function getFirebaseApp() {
    return initializeFirebase()?.app;
}

export function getFirebaseAuth() {
    return initializeFirebase()?.auth;
}

export function getFirebaseDB() {
    return initializeFirebase()?.db;
}

export function getRealtimeDB() {
    return initializeFirebase()?.rtdb;
}

export function getFirebaseStorage() {
    return initializeFirebase()?.storage;
}

export { firebaseConfig };
