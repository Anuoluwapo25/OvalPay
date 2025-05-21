import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBxAM2o_i3932vdqu_pWbep8ONmVECVZ5A", 
  authDomain: "auth-for-medlorix.firebaseapp.com",
  projectId: "auth-for-medlorix",
  storageBucket: "auth-for-medlorix.firebasestorage.app",
  messagingSenderId: "392444004453",
  appId: "1:392444004453:web:2a3f55d13805fe1244de8c"
};



const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

export { auth };
export default app;