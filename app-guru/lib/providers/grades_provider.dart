import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/core_models.dart';
import '../models/user_model.dart';

class GradesProvider with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  List<StudentModel> _students = [];
  Map<String, int> _grades = {}; // studentId -> integer score

  bool _isLoading = false;
  bool _isSubmitting = false;
  
  // Categories aligned with web admin constants.js: Tugas, UTS, UAS
  String _selectedCategory = 'Tugas';

  List<StudentModel> get students => _students;
  Map<String, int> get grades => _grades;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String get selectedCategory => _selectedCategory;

  final List<String> categories = [
    'Tugas',
    'Ulangan Harian',
    'UTS',
    'UAS',
  ];

  void setCategory(String cat) {
    _selectedCategory = cat;
    notifyListeners();
  }

  void updateGrade(String studentId, int score) {
    _grades[studentId] = score;
    notifyListeners();
  }

  Future<void> loadStudents(String classId) async {
    _isLoading = true;
    _students = [];
    _grades = {};
    notifyListeners();

    try {
      final snap = await _firestore
          .collection('students')
          .where('classId', isEqualTo: classId)
          .get();

      _students = snap.docs
          .map((d) => StudentModel.fromMap(d.data(), d.id))
          .toList();
          
      // Client-side sorting to prevent composite index errors
      _students.sort((a, b) => a.name.compareTo(b.name));

      for (var student in _students) {
        _grades[student.id] = 0; // Default grade is 0
      }
    } catch (e) {
      debugPrint('Error loading students for grades: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<String?> submitGrades({
    required UserModel guru,
    required ClassModel cls,
    required SubjectModel subj,
    required String assignmentName,
  }) async {
    if (_students.isEmpty) return 'Tidak ada murid untuk dinilai.';
    if (assignmentName.trim().isEmpty) return 'Nama tugas tidak boleh kosong.';

    _isSubmitting = true;
    notifyListeners();

    try {
      final batch = _firestore.batch();
      final now = FieldValue.serverTimestamp();

      // Create one grade document per student — matching web admin format:
      // Each doc: { studentId, classId, subjectId, teacherId, category, score, maxScore, date }
      for (var student in _students) {
        final gradeRef = _firestore.collection('grades').doc();
        batch.set(gradeRef, {
          'studentId': student.id,
          'classId': cls.id,
          'subjectId': subj.id,
          'teacherId': guru.id,
          'category': _selectedCategory,
          'assignmentName': assignmentName.trim(),
          'score': _grades[student.id] ?? 0,
          'maxScore': 100,
          'date': Timestamp.now(),
          'createdAt': now,
        });
      }

      await batch.commit();

      _isSubmitting = false;
      notifyListeners();
      return null;
    } catch (e) {
      _isSubmitting = false;
      notifyListeners();
      return 'Gagal menyimpan nilai: $e';
    }
  }
}

