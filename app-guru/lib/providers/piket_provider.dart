import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/core_models.dart';
import '../models/user_model.dart';

class TeacherSimple {
  final String id;
  final String name;

  TeacherSimple({required this.id, required this.name});
}

class PiketProvider with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  List<ClassModel> _classes = [];
  List<TeacherSimple> _allTeachers = [];
  List<StudentModel> _students = [];

  // Attendance maps
  Map<String, String> _studentAttendance = {}; // studentId -> status
  final Map<String, String> _teacherAttendance = {}; // teacherId -> status

  bool _isLoading = false;
  bool _isLoadingStudents = false;
  bool _isSubmitting = false;
  String? _selectedClassId;
  DateTime _selectedDate = DateTime.now();

  List<ClassModel> get classes => _classes;
  List<TeacherSimple> get allTeachers => _allTeachers;
  List<StudentModel> get students => _students;
  Map<String, String> get studentAttendance => _studentAttendance;
  Map<String, String> get teacherAttendance => _teacherAttendance;
  bool get isLoading => _isLoading;
  bool get isLoadingStudents => _isLoadingStudents;
  bool get isSubmitting => _isSubmitting;
  String? get selectedClassId => _selectedClassId;
  DateTime get selectedDate => _selectedDate;

  void setDate(DateTime date) {
    _selectedDate = date;
    notifyListeners();
  }

  Future<void> loadInitialData() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Load all classes
      final classSnap = await _firestore.collection('classes').get();
      _classes = classSnap.docs
          .map((d) => ClassModel.fromMap(d.data(), d.id))
          .toList();
      _classes.sort((a, b) => a.name.compareTo(b.name));

      // Load all teachers (from 'users' collection where role == 'guru')
      final teacherSnap = await _firestore
          .collection('users')
          .where('role', isEqualTo: 'guru')
          .get();
      _allTeachers = teacherSnap.docs.map((d) {
        final data = d.data();
        return TeacherSimple(
          id: d.id,
          name: data['name'] ?? '',
        );
      }).toList();
      _allTeachers.sort((a, b) => a.name.compareTo(b.name));

      // Default: mark all teachers as Hadir
      for (var t in _allTeachers) {
        _teacherAttendance[t.id] = 'Hadir';
      }

      // Check if teacher attendance already exists for today
      await _loadExistingTeacherAttendance();
    } catch (e) {
      debugPrint('Error loading piket data: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> _loadExistingTeacherAttendance() async {
    try {
      final dateStr = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
      final snap = await _firestore.collection('teacherAttendance').get();
      
      for (var doc in snap.docs) {
        final data = doc.data();
        final date = data['date'];
        if (date == null) continue;
        
        final d = date is Timestamp ? date.toDate() : DateTime.parse(date.toString());
        final docDateStr = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
        
        if (docDateStr == dateStr) {
          // Found existing record for this date
          final records = data['records'] as List<dynamic>? ?? [];
          for (var r in records) {
            final teacherId = r['teacherId'] as String? ?? '';
            final status = r['status'] as String? ?? 'hadir';
            if (teacherId.isNotEmpty) {
              _teacherAttendance[teacherId] = _capitalize(status);
            }
          }
          break;
        }
      }
    } catch (e) {
      debugPrint('Error loading existing teacher attendance: $e');
    }
  }

  Future<void> selectClass(String classId) async {
    _selectedClassId = classId;
    _isLoadingStudents = true;
    _students = [];
    _studentAttendance = {};
    notifyListeners();

    try {
      final snap = await _firestore
          .collection('students')
          .where('classId', isEqualTo: classId)
          .get();
      _students = snap.docs
          .map((d) => StudentModel.fromMap(d.data(), d.id))
          .toList();
      _students.sort((a, b) => a.name.compareTo(b.name));

      // Default: mark all as Hadir
      for (var s in _students) {
        _studentAttendance[s.id] = 'Hadir';
      }

      // Check if daily attendance already exists for this class & date
      await _loadExistingStudentAttendance(classId);
    } catch (e) {
      debugPrint('Error loading students: $e');
    }

    _isLoadingStudents = false;
    notifyListeners();
  }

  Future<void> _loadExistingStudentAttendance(String classId) async {
    try {
      final dateStr = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
      final snap = await _firestore.collection('dailyAttendance').get();
      
      for (var doc in snap.docs) {
        final data = doc.data();
        final date = data['date'];
        if (date == null) continue;
        
        final d = date is Timestamp ? date.toDate() : DateTime.parse(date.toString());
        final docDateStr = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
        
        if (docDateStr == dateStr) {
          final records = data['records'] as List<dynamic>? ?? [];
          for (var r in records) {
            final studentId = r['studentId'] as String? ?? '';
            final status = r['status'] as String? ?? 'hadir';
            if (studentId.isNotEmpty && _studentAttendance.containsKey(studentId)) {
              _studentAttendance[studentId] = _capitalize(status);
            }
          }
          break;
        }
      }
    } catch (e) {
      debugPrint('Error loading existing student attendance: $e');
    }
  }

  void updateStudentStatus(String studentId, String status) {
    _studentAttendance[studentId] = status;
    notifyListeners();
  }

  void updateTeacherStatus(String teacherId, String status) {
    _teacherAttendance[teacherId] = status;
    notifyListeners();
  }

  void markAllStudentsPresent() {
    for (var s in _students) {
      _studentAttendance[s.id] = 'Hadir';
    }
    notifyListeners();
  }

  void markAllTeachersPresent() {
    for (var t in _allTeachers) {
      _teacherAttendance[t.id] = 'Hadir';
    }
    notifyListeners();
  }

  /// Submit student attendance for the current class & date
  Future<String?> submitStudentAttendance() async {
    if (_students.isEmpty || _selectedClassId == null) {
      return 'Pilih kelas terlebih dahulu';
    }

    _isSubmitting = true;
    notifyListeners();

    try {
      final records = _students.map((s) {
        return {
          'studentId': s.id,
          'status': (_studentAttendance[s.id] ?? 'Hadir').toLowerCase(),
        };
      }).toList();

      // Check if record exists for this date
      final dateStr = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
      String? existingDocId;
      List<dynamic> existingRecords = [];

      final snap = await _firestore.collection('dailyAttendance').get();
      for (var doc in snap.docs) {
        final data = doc.data();
        final date = data['date'];
        if (date == null) continue;
        final d = date is Timestamp ? date.toDate() : DateTime.parse(date.toString());
        final docDateStr = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
        if (docDateStr == dateStr) {
          existingDocId = doc.id;
          existingRecords = data['records'] as List<dynamic>? ?? [];
          break;
        }
      }

      if (existingDocId != null) {
        // Remove old records for the current class's students to avoid duplicates
        final currentStudentIds = _students.map((s) => s.id).toSet();
        final mergedRecords = existingRecords.where((r) {
          final sId = r['studentId'] as String?;
          return sId != null && !currentStudentIds.contains(sId);
        }).toList();

        // Add the new records
        mergedRecords.addAll(records);

        await _firestore.collection('dailyAttendance').doc(existingDocId).update({
          'records': mergedRecords,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      } else {
        await _firestore.collection('dailyAttendance').add({
          'date': Timestamp.fromDate(_selectedDate),
          'records': records,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }

      _isSubmitting = false;
      notifyListeners();
      return null;
    } catch (e) {
      _isSubmitting = false;
      notifyListeners();
      return 'Gagal menyimpan: $e';
    }
  }

  /// Submit teacher attendance for the date
  Future<String?> submitTeacherAttendance() async {
    if (_allTeachers.isEmpty) return 'Tidak ada data guru';

    _isSubmitting = true;
    notifyListeners();

    try {
      final records = _allTeachers.map((t) {
        return {
          'teacherId': t.id,
          'status': (_teacherAttendance[t.id] ?? 'Hadir').toLowerCase(),
        };
      }).toList();

      final dateStr = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
      String? existingDocId;

      final snap = await _firestore.collection('teacherAttendance').get();
      for (var doc in snap.docs) {
        final data = doc.data();
        final date = data['date'];
        if (date == null) continue;
        final d = date is Timestamp ? date.toDate() : DateTime.parse(date.toString());
        final docDateStr = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
        if (docDateStr == dateStr) {
          existingDocId = doc.id;
          break;
        }
      }

      if (existingDocId != null) {
        await _firestore.collection('teacherAttendance').doc(existingDocId).update({
          'records': records,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      } else {
        await _firestore.collection('teacherAttendance').add({
          'date': Timestamp.fromDate(_selectedDate),
          'records': records,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }

      _isSubmitting = false;
      notifyListeners();
      return null;
    } catch (e) {
      _isSubmitting = false;
      notifyListeners();
      return 'Gagal menyimpan: $e';
    }
  }

  /// Submit piket journal
  Future<String?> submitPiketJournal({
    required UserModel guru,
    required String laporanPiket,
    required int jamPiket,
  }) async {
    if (laporanPiket.trim().isEmpty) return 'Laporan piket tidak boleh kosong';

    _isSubmitting = true;
    notifyListeners();

    try {
      await _firestore.collection('journals').add({
        'teacherId': guru.id,
        'material': laporanPiket.trim(),
        'jamPelajaran': jamPiket,
        'tipeKegiatan': 'piket',
        'date': Timestamp.fromDate(_selectedDate),
        'verified': false,
        'verifiedBy': null,
        'verifiedAt': null,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      _isSubmitting = false;
      notifyListeners();
      return null;
    } catch (e) {
      _isSubmitting = false;
      notifyListeners();
      return 'Gagal menyimpan jurnal piket: $e';
    }
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1).toLowerCase();
  }
}
