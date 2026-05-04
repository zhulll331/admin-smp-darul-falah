import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/core_models.dart';
import '../models/user_model.dart';

class AttendanceProvider with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  List<StudentModel> _students = [];
  Map<String, String> _attendanceStatus =
      {}; // studentId -> status (Hadir, Sakit, Izin, Alpa)

  bool _isLoading = false;
  bool _isSubmitting = false;

  List<StudentModel> get students => _students;
  Map<String, String> get attendanceStatus => _attendanceStatus;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;

  Future<void> loadStudents(String classId) async {
    _isLoading = true;
    _students = [];
    _attendanceStatus = {};
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

      // Default all to 'Hadir'
      for (var student in _students) {
        _attendanceStatus[student.id] = 'Hadir';
      }
    } catch (e) {
      debugPrint('Error loading students: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  void updateStatus(String studentId, String status) {
    _attendanceStatus[studentId] = status;
    notifyListeners();
  }

  Future<String?> submitSession({
    required UserModel guru,
    required ClassModel cls,
    required SubjectModel subj,
    required String journalEntry,
    required int jamPelajaran,
    required DateTime sessionDate,
  }) async {
    if (_students.isEmpty) return 'Tidak ada siswa di kelas ini.';
    if (journalEntry.trim().isEmpty) return 'Jurnal materi tidak boleh kosong.';

    _isSubmitting = true;
    notifyListeners();

    try {
      final batch = _firestore.batch();
      final now = FieldValue.serverTimestamp();

      // Build records array — format expected by web admin:
      // [ { studentId: "xxx", status: "hadir" }, ... ]
      final List<Map<String, dynamic>> records = _students.map((student) {
        final displayStatus = _attendanceStatus[student.id] ?? 'Hadir';
        return {
          'studentId': student.id,
          'status': displayStatus.toLowerCase(), // Web admin expects lowercase
        };
      }).toList();

      // 1. Create Attendance Document
      final attRef = _firestore.collection('attendance').doc();
      batch.set(attRef, {
        'classId': cls.id,
        'subjectId': subj.id,
        'teacherId': guru.id,
        'date': Timestamp.fromDate(sessionDate),
        'records': records, // Array format matching web admin
        'createdAt': now,
        'updatedAt': now,
      });

      // 2. Create Journal Document
      // Web admin reads field "material" (not "summary")
      final journalRef = _firestore.collection('journals').doc();
      batch.set(journalRef, {
        'classId': cls.id,
        'subjectId': subj.id,
        'teacherId': guru.id,
        'material': journalEntry.trim(), // Field name web admin expects
        'jamPelajaran': jamPelajaran,
        'date': Timestamp.fromDate(sessionDate),
        'verified': false,
        'verifiedBy': null,
        'verifiedAt': null,
        'createdAt': now,
        'updatedAt': now,
      });

      await batch.commit();

      _isSubmitting = false;
      notifyListeners();
      return null;
    } catch (e) {
      _isSubmitting = false;
      notifyListeners();
      return 'Gagal menyimpan: $e';
    }
  }
}

