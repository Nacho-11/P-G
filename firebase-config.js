// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyByocOj5lgFkECZu7B4hdzqCzczqmtisRQ",
  authDomain: "perdidas-y-ganancias.firebaseapp.com",
  databaseURL: "https://perdidas-y-ganancias-default-rtdb.firebaseio.com",
  projectId: "perdidas-y-ganancias",
  storageBucket: "perdidas-y-ganancias.firebasestorage.app",
  messagingSenderId: "368391997370",
  appId: "1:368391997370:web:c885224cce2d6d49dfbf83",
  measurementId: "G-NV0CGJVEX8"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

console.log('✅ Firebase inicializado correctamente');