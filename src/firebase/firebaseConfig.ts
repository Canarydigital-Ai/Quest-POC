import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyCGq9BN5jULB8CEur8qnn2nUiSjN1skbLU",
  authDomain: "qr-code-96b2a.firebaseapp.com",
  projectId: "qr-code-96b2a",
  storageBucket: "qr-code-96b2a.appspot.com", 
  messagingSenderId: "1042677798910",
  appId: "1:1042677798910:web:bfdd6d1095c4f5a7f212af",
  measurementId: "G-66XPF7D5W3",
};

const app = initializeApp(firebaseConfig);

// 👇 This helps with corporate networks / adblockers:
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

const auth = getAuth(app);

// Make sure you sign in once on app load
signInAnonymously(auth).catch((e) => {
  console.error("Anonymous sign-in failed:", e);
});

export { app, db, auth };
