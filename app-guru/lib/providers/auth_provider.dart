import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user_model.dart';

class AuthProvider with ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  UserModel? _currentUser;
  bool _isLoading = true;

  // Diagnostic info
  List<String> _authDiagnostics = [];
  List<String> get authDiagnostics => _authDiagnostics;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;

  AuthProvider() {
    _initAuthListener();
  }

  void _initAuthListener() {
    _auth.authStateChanges().listen((User? user) async {
      _isLoading = true;
      notifyListeners();

      if (user != null) {
        await _fetchUserData(user.uid);
      } else {
        _currentUser = null;
      }

      _isLoading = false;
      notifyListeners();
    });
  }

  Future<void> _fetchUserData(String uid) async {
    _authDiagnostics = [];
    try {
      _authDiagnostics.add('Firebase UID: $uid');
      _authDiagnostics.add('Email: ${_auth.currentUser?.email ?? "null"}');
      debugPrint('[AuthProvider] Fetching user data for uid: $uid');
      DocumentSnapshot doc = await _firestore.collection('users').doc(uid).get();
      Map<String, dynamic>? data;
      String docId = uid;

      if (doc.exists) {
        _authDiagnostics.add('✅ Doc ditemukan by UID');
        debugPrint('[AuthProvider] Found user doc by UID: $uid');
        data = doc.data() as Map<String, dynamic>;
      } else {
        _authDiagnostics.add('⚠️ Doc TIDAK ada by UID, coba by email...');
        // Fallback: Check if user exists by Email (since Admin created them in Web Admin)
        if (_auth.currentUser != null && _auth.currentUser!.email != null) {
          final querySnapshot = await _firestore
              .collection('users')
              .where('email', isEqualTo: _auth.currentUser!.email)
              .limit(1)
              .get();
              
          if (querySnapshot.docs.isNotEmpty) {
            data = querySnapshot.docs.first.data();
            docId = querySnapshot.docs.first.id;
            _authDiagnostics.add('✅ Doc ditemukan by email! docId=$docId');
            debugPrint('[AuthProvider] Found user doc by email fallback. docId=$docId');
          } else {
            _authDiagnostics.add('❌ Doc TIDAK ditemukan by email juga');
            debugPrint('[AuthProvider] No user doc found by email either');
          }
        }
      }

      if (data != null) {
        _authDiagnostics.add('Data: role=${data['role']}, isActive=${data['isActive']}');
        _authDiagnostics.add('subjectIds=${data['subjectIds']}');
        // Ensure only 'guru' or 'admin' can login.
        if (data['role'] == 'guru' && data['isActive'] == true) {
          _currentUser = UserModel.fromMap(data, docId);
          _authDiagnostics.add('✅ Login OK: ${_currentUser!.name} (docId=$docId)');
          debugPrint('[AuthProvider] Login OK: name=${_currentUser!.name}, id=$docId, subjectIds=${_currentUser!.subjectIds}');
          return;
        } else {
          _authDiagnostics.add('❌ Ditolak: role=${data['role']}, isActive=${data['isActive']}');
        }
      } else {
        _authDiagnostics.add('❌ Tidak ada data user di Firestore');
      }
      
      // If inactive, not a guru, or document not found, log them out
      await _auth.signOut();
      await _googleSignIn.signOut();
      _currentUser = null;
    } catch (e) {
      _authDiagnostics.add('❌ Exception: $e');
      debugPrint('Error fetching user data: $e');
      _currentUser = null;
    }
  }

  Future<String?> login(String email, String password) async {
    try {
      _isLoading = true;
      notifyListeners();

      UserCredential credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      await _fetchUserData(credential.user!.uid);

      if (_currentUser == null) {
        return 'Akun Anda belum terdaftar atau dinonaktifkan, coba hubungi admin.';
      }

      return null; // Null means success
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found' || e.code == 'wrong-password' || e.code == 'invalid-credential') {
        return 'Email atau password salah';
      }
      return e.message;
    } catch (e) {
      return 'Terjadi kesalahan sistem';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sign in with Google account.
  /// Returns null on success, or an error message string on failure.
  Future<String?> loginWithGoogle() async {
    try {
      _isLoading = true;
      notifyListeners();

      // Trigger the Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        // User cancelled the sign-in
        return 'Login dibatalkan';
      }

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the Google credential
      final UserCredential userCredential =
          await _auth.signInWithCredential(credential);

      // Fetch user data from Firestore to check if they are a registered guru
      await _fetchUserData(userCredential.user!.uid);

      if (_currentUser == null) {
        // Not a registered guru — sign out completely
        await _auth.signOut();
        await _googleSignIn.signOut();
        return 'Akun Anda belum terdaftar, coba hubungi admin.';
      }

      return null; // Success
    } on FirebaseAuthException catch (e) {
      debugPrint('Google Sign-In FirebaseAuth error: ${e.code}');
      return 'Gagal login dengan Google: ${e.message}';
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      return 'Terjadi kesalahan saat login dengan Google';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
    _currentUser = null;
    notifyListeners();
  }
}
