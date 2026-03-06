// firebase-config.js - Versión sin imports

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByocOj5lgFkECZu7B4hdzqCzczqmtisRQ",
  authDomain: "perdidas-y-ganancias.firebaseapp.com",
  projectId: "perdidas-y-ganancias",
  storageBucket: "perdidas-y-ganancias.firebasestorage.app",
  messagingSenderId: "368391997370",
  appId: "1:368391997370:web:c885224cce2d6d49dfbf83"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Hacer disponibles las referencias globalmente
window.database = firebase.database();
window.auth = firebase.auth();

console.log('✅ Firebase inicializado correctamente');