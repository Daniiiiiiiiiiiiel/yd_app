import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBfxCx4eLQXDDPnymGS71UOZhHTYNj_gxU",
    authDomain: "yd-app-649a4.firebaseapp.com",
    projectId: "yd-app-649a4",
    storageBucket: "yd-app-649a4.firebasestorage.app",
    messagingSenderId: "633176658126",
    appId: "1:633176658126:web:5cc43fc7cac3c6c8ea809f"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
