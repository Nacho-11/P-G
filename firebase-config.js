// firebase-config.js
// Configuración de Firebase - VERSIÓN COMPAT CORRECTA

const firebaseConfig = {
  apiKey: "AIzaSyC2_4dQT26UcxbssDDVHvbTiCsnTjQROjA",
  authDomain: "perdidas-y-ganancias-86a6c.firebaseapp.com",
  databaseURL: "https://perdidas-y-ganancias-86a6c-default-rtdb.firebaseio.com",
  projectId: "perdidas-y-ganancias-86a6c",
  storageBucket: "perdidas-y-ganancias-86a6c.firebasestorage.app",
  messagingSenderId: "711660848488",
  appId: "1:711660848488:web:4798c98ee834c9c0ad02dd"
};

// Inicializar Firebase con sintaxis COMPAT
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado correctamente');
} else {
  console.log('ℹ️ Firebase ya estaba inicializado');
}