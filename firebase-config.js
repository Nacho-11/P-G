// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    remove, 
    update,
    get,
    child
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ✅ TU CONFIGURACIÓN ESTÁ BIEN
const firebaseConfig = {
  apiKey: "AIzaSyByocOj5lgFkECZu7B4hdzqCzczqmtisRQ",
  authDomain: "perdidas-y-ganancias.firebaseapp.com",
  projectId: "perdidas-y-ganancias",
  storageBucket: "perdidas-y-ganancias.firebasestorage.app",
  messagingSenderId: "368391997370",
  appId: "1:368391997370:web:c885224cce2d6d49dfbf83"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { 
    database, 
    ref, 
    set, 
    push, 
    onValue, 
    remove, 
    update,
    get,
    child,
    auth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
};