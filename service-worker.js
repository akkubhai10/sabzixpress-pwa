// /service-worker.js

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// IMPORTANT: You must copy your Firebase config object here
const firebaseConfig = {
  apiKey: "AIzaSyB6L9DdKKM88_0LkTvW0ikdmIReut9WJ8I",
  authDomain: "sabzixpress-d9f32.firebaseapp.com",
  projectId: "sabzixpress-d9f32",
  storageBucket: "sabzixpress-d9f32.appspot.com",
  messagingSenderId: "886184575130",
  appId: "1:886184575130:web:062835af0c69d277ba5f23"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This event is triggered when a push notification is received while the service worker is active.
messaging.onBackgroundMessage(function(payload) {
    console.log('[service-worker.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/path/to/icon.png' // Optional: path to an icon
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Basic install event listener to ensure the service worker activates
self.addEventListener('install', event => {
  console.log('Service Worker: I am installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker: I am activated');
});