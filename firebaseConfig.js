// Import the functions you need from the SDKs you need
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDj61l8YSDAQV8K_We62vcWJLXd-NkCBjU",
  authDomain: "mobile2026-faab0.firebaseapp.com",
  projectId: "mobile2026-faab0",
  storageBucket: "mobile2026-faab0.firebasestorage.app",
  messagingSenderId: "845834353304",
  appId: "1:845834353304:web:64add86a27e2a498f3eeed",
  databaseURL: 'https://atividade-2-d4d58-default-rtdb.firebaseio.com/'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);