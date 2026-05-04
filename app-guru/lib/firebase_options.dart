import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        // Fallback to web options for other platforms
        return web;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBN3xR7JH576KaInCRK4MC0xM8GKNDuwgU',
    appId: '1:260813482745:android:0b89cf01a5f1be8bab9028',
    messagingSenderId: '260813482745',
    projectId: 'manajemen-guru-smpplus',
    storageBucket: 'manajemen-guru-smpplus.firebasestorage.app',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDUfwhBNZo9iaBosQFPmvk33KMuclP513w',
    appId: '1:260813482745:web:c20eb27e02bf4650ab9028',
    messagingSenderId: '260813482745',
    projectId: 'manajemen-guru-smpplus',
    authDomain: 'manajemen-guru-smpplus.firebaseapp.com',
    storageBucket: 'manajemen-guru-smpplus.firebasestorage.app',
  );
}
