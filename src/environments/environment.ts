// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: "AIzaSyDXLbgLdP1X6WtVyR3Z8L-ELs5fgZgnASQ",
    authDomain: "prod-todayuonggi.firebaseapp.com",
    databaseURL: "https://prod-todayuonggi-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "prod-todayuonggi",
    storageBucket: "prod-todayuonggi.firebasestorage.app",
    messagingSenderId: "461426577529",
    appId: "1:461426577529:web:f7bcc4fc67de7aada244a8",
    measurementId: "G-G75HCSB5BF"
  },
  // Fallback only — actual value is fetched from Firebase Remote Config (key: `api_url`).
  // Used when Remote Config hasn't loaded yet or fetch fails.
  apiURL: 'http://localhost:3000',
  pwd: 'EMBEXINHDEP'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
