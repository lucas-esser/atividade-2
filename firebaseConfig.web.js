import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDj61l8YSDAQV8K_We62vcWJLXd-NkCBjU",
  authDomain: "mobile2026-faab0.firebaseapp.com",
  projectId: "mobile2026-faab0",
  storageBucket: "mobile2026-faab0.firebasestorage.app",
  messagingSenderId: "845834353304",
  appId: "1:845834353304:web:64add86a27e2a498f3eeed",
  databaseURL: "https://mobile2026-faab0-default-rtdb.firebaseio.com/",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
