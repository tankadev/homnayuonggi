importScripts('https://www.gstatic.com/firebasejs/7.6.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.6.0/firebase-messaging.js');
firebase.initializeApp({
    apiKey: "AIzaSyDFCughhn6YDYKifvpuNQcCvF5bDVhAn2Q",
    authDomain: "homnaychonmongi.firebaseapp.com",
    databaseURL: "https://homnaychonmongi-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "homnaychonmongi",
    storageBucket: "homnaychonmongi.appspot.com",
    messagingSenderId: "405891226420",
    appId: "1:405891226420:web:d5679ea5c12d9beca2a361",
    measurementId: "G-VHZJ2DCT10"
});
const messaging = firebase.messaging();