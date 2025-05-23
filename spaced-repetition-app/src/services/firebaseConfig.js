import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuración de Firebase (temporal - actualizar con tus credenciales)
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4XSq5R0ZbqjqPVtOulkK6sEHkoOoOJz4",
  authDomain: "app-horarios-flash.firebaseapp.com",
  projectId: "app-horarios-flash",
  storageBucket: "app-horarios-flash.firebasestorage.app",
  messagingSenderId: "676286081068",
  appId: "1:676286081068:web:6694005f91b2b5ca07c989"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app; 