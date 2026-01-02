// /js/firebase.js

// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6L9DdKKM88_0LkTvW0ikdmIReut9WJ8I",
  authDomain: "sabzixpress-d9f32.firebaseapp.com",
  projectId: "sabzixpress-d9f32",
  databaseURL: "https://sabzixpress-d9f32-default-rtdb.asia-southeast1.firebasedatabase.app", // Make sure this is correct
  storageBucket: "sabzixpress-d9f32.appspot.com",
  messagingSenderId: "886184575130",
  appId: "1:886184575130:web:062835af0c69d277ba5f23"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services
const auth = firebase.auth();
const db = firebase.database();
const messaging = firebase.messaging.isSupported() ? firebase.messaging() : null;

console.log("Firebase Initialized");