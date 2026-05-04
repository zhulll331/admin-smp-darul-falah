import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/core_models.dart';
import '../models/user_model.dart';

class HomeProvider with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  List<ClassModel> _classes = [];
  List<SubjectModel> _subjects = [];

  ClassModel? _selectedClass;
  SubjectModel? _selectedSubject;

  bool _isLoading = false;

  // Real dashboard stats
  int _attendancePercent = 0;
  int _totalJournals = 0;
  int _totalStudents = 0;

  // Teacher's recent class-subject schedule (from attendance data)
  List<Map<String, String>> _mySchedule = [];

  List<ClassModel> get classes => _classes;
  List<SubjectModel> get subjects => _subjects;

  ClassModel? get selectedClass => _selectedClass;
  SubjectModel? get selectedSubject => _selectedSubject;

  bool get isLoading => _isLoading;
  bool get canStartSession =>
      _selectedClass != null && _selectedSubject != null;
  bool get hasMultipleSubjects => _subjects.length > 1;

  int get attendancePercent => _attendancePercent;
  int get totalJournals => _totalJournals;
  int get totalStudents => _totalStudents;
  List<Map<String, String>> get mySchedule => _mySchedule;

  // Diagnostic info (visible on screen for debugging)
  List<String> _diagnostics = [];
  String? _errorMsg;
  List<String> get diagnostics => _diagnostics;
  String? get errorMsg => _errorMsg;

  // Calendar filter
  DateTime? _filterDate;
  DateTime? get filterDate => _filterDate;

  // Caching docs for local filtering
  List<QueryDocumentSnapshot<Map<String, dynamic>>> _allAttendanceDocs = [];
  List<QueryDocumentSnapshot<Map<String, dynamic>>> _allJournalDocs = [];
  UserModel? _currentGuru;

  Future<void> loadDashboardData(UserModel guru) async {
    _isLoading = true;
    notifyListeners();

    _diagnostics = [];
    _errorMsg = null;

    try {
      _diagnostics.add('Guru: ${guru.name} (id=${guru.id})');
      _diagnostics.add('subjectIds: ${guru.subjectIds}');
      debugPrint('[HomeProvider] === Loading Dashboard for guru: ${guru.name} (id=${guru.id}) ===');
      debugPrint('[HomeProvider] guru.subjectIds = ${guru.subjectIds}');
      // Fetch classes
      final classSnap = await _firestore
          .collection('classes')
          .get();
      _classes = classSnap.docs
          .map((d) => ClassModel.fromMap(d.data(), d.id))
          .toList();
      _classes.sort((a, b) => a.name.compareTo(b.name));
      _diagnostics.add('✅ Kelas: ${_classes.length} (${_classes.map((c) => c.name).join(", ")})');
      debugPrint('[HomeProvider] Loaded ${_classes.length} classes');

      // Fetch subjects: Fallback to all if subjectIds is empty
      try {
        if (guru.subjectIds.isNotEmpty) {
          // Firestore whereIn has a 10-item limit, chunk if needed
          final List<SubjectModel> allSubjects = [];
          final chunks = <List<String>>[];
          for (var i = 0; i < guru.subjectIds.length; i += 10) {
            chunks.add(guru.subjectIds.sublist(i, i + 10 > guru.subjectIds.length ? guru.subjectIds.length : i + 10));
          }
          for (var chunk in chunks) {
            final subjSnap = await _firestore
                .collection('subjects')
                .where(FieldPath.documentId, whereIn: chunk)
                .get();
            allSubjects.addAll(subjSnap.docs
                .map((d) => SubjectModel.fromMap(d.data(), d.id)));
          }
          _subjects = allSubjects;
          _diagnostics.add('✅ Mapel (by ID): ${_subjects.length} (${_subjects.map((s) => s.name).join(", ")})');
          debugPrint('[HomeProvider] Loaded ${_subjects.length} subjects for guru (from ${guru.subjectIds.length} subjectIds)');
        } else {
          _diagnostics.add('⚠️ Guru belum punya subjectIds, load semua mapel');
          debugPrint('[HomeProvider] Guru has no subjectIds, loading all subjects');
          final subjSnap = await _firestore
              .collection('subjects')
              .get();
          _subjects = subjSnap.docs
              .map((d) => SubjectModel.fromMap(d.data(), d.id))
              .toList();
        }
      } catch (e) {
        debugPrint('[HomeProvider] Error loading subjects by subjectIds: $e');
        _diagnostics.add('❌ Error mapel: $e (fallback ke semua)');
        // Fallback: load ALL subjects so teacher is not stuck
        final subjSnap = await _firestore.collection('subjects').get();
        _subjects = subjSnap.docs
            .map((d) => SubjectModel.fromMap(d.data(), d.id))
            .toList();
      }
      _subjects.sort((a, b) => a.name.compareTo(b.name));

      // Auto-select first subject by default so teacher doesn't have to manually pick it every time
      if (_subjects.isNotEmpty) {
        _selectedSubject = _subjects.first;
      }

      // Fetch total students
      final studentSnap = await _firestore.collection('students').get();
      _totalStudents = studentSnap.docs.length;
      _diagnostics.add('✅ Siswa: $_totalStudents');
      debugPrint('[HomeProvider] Total students: $_totalStudents');

      // Fetch ALL attendance records for stats (both web admin & mobile formats)
      final allAttendanceSnap = await _firestore
          .collection('attendance')
          .get();
      _allAttendanceDocs = allAttendanceSnap.docs;
      debugPrint('[HomeProvider] Total attendance docs: ${_allAttendanceDocs.length}');

      // Fetch ALL journals for count
      final allJournalSnap = await _firestore
          .collection('journals')
          .get();
      _allJournalDocs = allJournalSnap.docs;

      _currentGuru = guru;
      _calculateStats();
      debugPrint('[HomeProvider] Journals found: $_totalJournals');
      debugPrint('[HomeProvider] === Dashboard loaded successfully ===');

    } catch (e) {
      _errorMsg = e.toString();
      _diagnostics.add('❌ ERROR: $e');
      debugPrint('[HomeProvider] !!! ERROR loading dashboard: $e');
      debugPrint('[HomeProvider] Stack trace: ${StackTrace.current}');
    }

    _isLoading = false;
    notifyListeners();
  }

  void selectClass(ClassModel? cls) {
    _selectedClass = cls;
    notifyListeners();
  }

  void selectSubject(SubjectModel? subj) {
    _selectedSubject = subj;
    notifyListeners();
  }

  void clearSelection() {
    _selectedClass = null;
    _selectedSubject = null;
    notifyListeners();
  }

  void setFilterDate(DateTime? date) {
    _filterDate = date;
    if (_currentGuru != null) {
      _diagnostics.add('ℹ️ Filter diubah ke: ${date?.toString().split(' ')[0] ?? "Semua Waktu"}');
      _calculateStats();
      notifyListeners();
    }
  }

  void _calculateStats() {
    if (_currentGuru == null) return;
    final guru = _currentGuru!;

    int totalHadir = 0;
    int totalRecords = 0;
    int myAttendanceDocs = 0;
    final Set<String> scheduleSet = {};
    _mySchedule = [];

    // Local helper to match date
    bool matchesDate(dynamic firestoreDate, dynamic fallbackDate) {
      if (_filterDate == null) return true; // No filter = all dates
      
      dynamic dateToUse = firestoreDate ?? fallbackDate;
      if (dateToUse == null) return false;
      
      DateTime dt;
      if (dateToUse is Timestamp) {
        dt = dateToUse.toDate();
      } else if (dateToUse is String) {
        dt = DateTime.tryParse(dateToUse) ?? DateTime.now();
      } else {
        return false;
      }
      return dt.year == _filterDate!.year && 
             dt.month == _filterDate!.month && 
             dt.day == _filterDate!.day;
    }

    for (var doc in _allAttendanceDocs) {
      final data = doc.data();
      if (!matchesDate(data['date'], data['createdAt'])) continue;

      final docTeacherId = data['teacherId']?.toString() ?? '';

      // Format A: Mobile app format (batch doc with records array)
      final records = data['records'] as List<dynamic>?;
      if (records != null && records.isNotEmpty) {
        totalRecords += records.length;
        totalHadir += records.where((r) => r['status'] == 'hadir').length;

        // Build schedule only from this teacher's records
        if (docTeacherId == guru.id) {
          myAttendanceDocs++;
          final classId = data['classId']?.toString() ?? '';
          final subjectId = data['subjectId']?.toString() ?? '';
          final comboKey = '$classId|$subjectId';
          if (!scheduleSet.contains(comboKey) && classId.isNotEmpty) {
            scheduleSet.add(comboKey);
            final className = _classes.firstWhere(
              (c) => c.id == classId,
              orElse: () => ClassModel(id: '', name: classId),
            ).name;
            final subjectName = _subjects.firstWhere(
              (s) => s.id == subjectId,
              orElse: () => SubjectModel(id: '', name: subjectId),
            ).name;
            _mySchedule.add({
              'classId': classId,
              'subjectId': subjectId,
              'className': className,
              'subjectName': subjectName,
            });
          }
        }
      } else if (data['studentId'] != null) {
        // Format B: Web admin format (individual doc per student)
        totalRecords++;
        final status = data['status']?.toString().toLowerCase() ?? '';
        if (status == 'hadir') totalHadir++;
      }
    }

    _attendancePercent = totalRecords > 0
        ? ((totalHadir / totalRecords) * 100).round()
        : 0;

    // Fetch ALL journals for count
    int myJournals = 0;
    for (var doc in _allJournalDocs) {
      final data = doc.data();
      if (!matchesDate(data['date'], data['createdAt'])) continue;

      if (data['teacherId']?.toString() == guru.id) {
        myJournals++;
      }
    }
    _totalJournals = myJournals;
  }
}
