import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8oSFSnuxESP5AwXO2-GWHD8A-_0CvLnE",
    authDomain: "gym-blueprint.firebaseapp.com",
    projectId: "gym-blueprint",
    storageBucket: "gym-blueprint.firebasestorage.app",
    messagingSenderId: "1088980958398",
    appId: "1:1088980958398:web:cc799f0a27afc196c532ef",
    measurementId: "G-8KD1KYKQ9D"
};

let app, auth, db, analytics, useFirebase = false;

if (firebaseConfig.apiKey) {
    try { 
        app = initializeApp(firebaseConfig); 
        auth = getAuth(app); 
        db = getFirestore(app); 
        analytics = getAnalytics(app); 
        useFirebase = true; 
    } catch(e) { 
        console.error("Firebase init failed", e); 
    }
}

export { app, auth, db, analytics, useFirebase };
