// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAgubkeI5kgKY9vqVEOofYrR-tbx228quI",
  authDomain: "bettereveryday-27b7f.firebaseapp.com",
  projectId: "bettereveryday-27b7f",
  storageBucket: "bettereveryday-27b7f.firebasestorage.app",
  messagingSenderId: "502800802176",
  appId: "1:502800802176:web:3bc4f8b0f2d9b95d592165",
  measurementId: "G-89WWCF9JHW"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);