import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:excel/excel.dart' as xl;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import '../providers/auth_provider.dart';
import '../providers/home_provider.dart';
import '../utils/colors.dart';
import '../models/core_models.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  bool _isLoading = false;
  bool _isGenerating = false;
  String? _selectedClassId;
  DateTime _selectedMonth = DateTime.now();

  // Report data
  List<StudentModel> _students = [];
  List<Map<String, dynamic>> _attendanceData = [];
  List<Map<String, dynamic>> _gradesData = [];

  @override
  void initState() {
    super.initState();
    initializeDateFormatting('id');
  }

  @override
  Widget build(BuildContext context) {
    final home = context.watch<HomeProvider>();

    return Stack(
      children: [
        Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: const Text(
              'Rekapan Laporan',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── Header Instruction ─────────────────────────────
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.description_rounded, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Download Laporan Lengkap',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Rekap absensi & nilai siswa per kelas dalam format CSV',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // ── Class & Month Selection ────────────────────────────────
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PILIH KELAS',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedClassId,
                                hint: const Text('Pilih kelas'),
                                isExpanded: true,
                                icon: const Icon(Icons.keyboard_arrow_down_rounded),
                                borderRadius: BorderRadius.circular(16),
                                items: home.classes.map((cls) {
                                  return DropdownMenuItem(
                                    value: cls.id,
                                    child: Text(cls.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  setState(() {
                                    _selectedClassId = val;
                                    _students = [];
                                    _attendanceData = [];
                                    _gradesData = [];
                                  });
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PILIH BULAN',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: () async {
                              final date = await showDatePicker(
                                context: context,
                                initialDate: _selectedMonth,
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2100),
                              );
                              if (date != null) {
                                setState(() {
                                  _selectedMonth = DateTime(date.year, date.month);
                                  _students = [];
                                  _attendanceData = [];
                                  _gradesData = [];
                                });
                              }
                            },
                            child: Container(
                              height: 48,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    DateFormat('MMM yyyy', 'id').format(_selectedMonth),
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                                  ),
                                  const Icon(Icons.calendar_today_rounded, size: 20, color: AppColors.textSecondary),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // ── Load Data Button ──────────────────────────────
                SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _selectedClassId != null && !_isLoading
                        ? () => _loadReportData(home)
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      disabledBackgroundColor: AppColors.divider,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.search_rounded, color: Colors.white),
                              SizedBox(width: 10),
                              Text(
                                'Muat Data',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),

                // ── Data Summary ──────────────────────────────────
                if (_students.isNotEmpty) ...[
                  const SizedBox(height: 32),

                  const Text(
                    'RINGKASAN DATA',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Stats Row
                  Row(
                    children: [
                      _buildSummaryCard(
                        Icons.people_rounded,
                        '${_students.length}',
                        'Siswa',
                        Colors.blue,
                      ),
                      const SizedBox(width: 12),
                      _buildSummaryCard(
                        Icons.how_to_reg_rounded,
                        '${_attendanceData.length}',
                        'Sesi Absensi',
                        Colors.green,
                      ),
                      const SizedBox(width: 12),
                      _buildSummaryCard(
                        Icons.star_rounded,
                        '${_gradesData.length}',
                        'Data Nilai',
                        Colors.orange,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Download Buttons ──────────────────────────
                  const Text(
                    'UNDUH LAPORAN',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 12),

                  _buildDownloadTile(
                    icon: Icons.how_to_reg_rounded,
                    color: Colors.green,
                    title: 'Rekap Absensi',
                    subtitle: 'Kehadiran siswa lengkap dengan tanggal & status',
                    onTap: () => _generateAttendanceReport(home),
                  ),
                  const SizedBox(height: 12),
                  _buildDownloadTile(
                    icon: Icons.star_rounded,
                    color: Colors.orange,
                    title: 'Rekap Nilai',
                    subtitle: 'Nilai siswa per kategori (Tugas, UTS, UAS)',
                    onTap: () => _generateGradesReport(home),
                  ),
                  const SizedBox(height: 12),
                  _buildDownloadTile(
                    icon: Icons.assessment_rounded,
                    color: AppColors.primary,
                    title: 'Laporan Lengkap',
                    subtitle: 'Gabungan absensi & nilai dalam satu file',
                    onTap: () => _generateFullReport(home),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Generating overlay
        if (_isGenerating)
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: 0.3),
              child: const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
            ),
          ),
      ],
    );
  }

  // ── Load Report Data ──────────────────────────────────────────

  Future<void> _loadReportData(HomeProvider home) async {
    if (_selectedClassId == null) return;

    setState(() => _isLoading = true);

    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.currentUser!.id;

      // 1. Fetch students of this class
      final studSnap = await _firestore
          .collection('students')
          .where('classId', isEqualTo: _selectedClassId)
          .get();
      final students = studSnap.docs
          .map((d) => StudentModel.fromMap(d.data(), d.id))
          .toList();
      students.sort((a, b) => a.name.compareTo(b.name));

      final startOfMonth = DateTime(_selectedMonth.year, _selectedMonth.month, 1);
      final endOfMonth = DateTime(_selectedMonth.year, _selectedMonth.month + 1, 0, 23, 59, 59);

      // 2. Fetch attendance for this class by this teacher
      final attSnap = await _firestore
          .collection('attendance')
          .where('teacherId', isEqualTo: userId)
          .where('classId', isEqualTo: _selectedClassId)
          .get();
      final attendanceData = attSnap.docs.map((d) {
        final data = d.data();
        return {
          ...data,
          'id': d.id,
        };
      }).where((d) {
        final date = (d['date'] as Timestamp?)?.toDate();
        if (date == null) return false;
        return date.isAfter(startOfMonth.subtract(const Duration(seconds: 1))) && 
               date.isBefore(endOfMonth.add(const Duration(seconds: 1)));
      }).toList();

      // 3. Fetch grades for this class by this teacher
      final gradeSnap = await _firestore
          .collection('grades')
          .where('teacherId', isEqualTo: userId)
          .where('classId', isEqualTo: _selectedClassId)
          .get();
      final gradesData = gradeSnap.docs.map((d) {
        final data = d.data();
        return {
          ...data,
          'id': d.id,
        };
      }).where((d) {
        final date = (d['date'] as Timestamp?)?.toDate();
        if (date == null) return false;
        return date.isAfter(startOfMonth.subtract(const Duration(seconds: 1))) && 
               date.isBefore(endOfMonth.add(const Duration(seconds: 1)));
      }).toList();

      setState(() {
        _students = students;
        _attendanceData = attendanceData;
        _gradesData = gradesData;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading report data: $e');
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat data: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  // ── Generate Attendance Report ────────────────────────────────

  Future<void> _generateAttendanceReport(HomeProvider home) async {
    setState(() => _isGenerating = true);

    try {
      final className = home.classes
          .firstWhere((c) => c.id == _selectedClassId,
              orElse: () => ClassModel(id: '', name: 'Kelas'))
          .name;

      // Build attendance matrix: student x date
      final dateFormat = DateFormat('dd/MM/yyyy');
      final Map<String, Map<String, String>> matrix = {};
      final Set<String> allDates = {};
      final Map<String, String> dateSubjects = {};

      for (var att in _attendanceData) {
        final date = (att['date'] as Timestamp?)?.toDate() ?? DateTime.now();
        final dateStr = dateFormat.format(date);
        allDates.add(dateStr);

        final subjectId = att['subjectId'] as String? ?? '';
        final subjectName = home.subjects
            .firstWhere((s) => s.id == subjectId,
                orElse: () => SubjectModel(id: '', name: '-'))
            .name;
        dateSubjects[dateStr] = subjectName;

        final records = att['records'] as List<dynamic>? ?? [];
        for (var rec in records) {
          final studentId = rec['studentId'] as String? ?? '';
          final status = rec['status'] as String? ?? '-';
          matrix.putIfAbsent(studentId, () => {});
          matrix[studentId]![dateStr] = status;
        }
      }

      final sortedDates = allDates.toList()
        ..sort((a, b) {
          final dA = dateFormat.parse(a);
          final dB = dateFormat.parse(b);
          return dA.compareTo(dB);
        });

      // Build CSV rows
      final List<List<String>> rows = [];
      // Title row
      rows.add(['REKAP ABSENSI - $className']);
      rows.add(['Dicetak: ${DateFormat('dd MMMM yyyy, HH:mm', 'id').format(DateTime.now())}']);
      rows.add([]);
      // Header
      rows.add([
        'No',
        'Nama Siswa',
        'NIS',
        ...sortedDates.map((d) => '$d\n(${dateSubjects[d] ?? "-"})'),
        'Total Hadir',
        'Total Sakit',
        'Total Izin',
        'Total Alpa',
        '% Kehadiran',
      ]);

      for (var i = 0; i < _students.length; i++) {
        final student = _students[i];
        int hadir = 0, sakit = 0, izin = 0, alpa = 0;
        final statuses = <String>[];

        for (var dateStr in sortedDates) {
          final status = matrix[student.id]?[dateStr] ?? '-';
          statuses.add(status.toUpperCase().substring(0, 1));
          switch (status) {
            case 'hadir':
              hadir++;
              break;
            case 'sakit':
              sakit++;
              break;
            case 'izin':
              izin++;
              break;
            case 'alpa':
              alpa++;
              break;
          }
        }

        final total = hadir + sakit + izin + alpa;
        final pct = total > 0 ? ((hadir / total) * 100).round() : 0;

        rows.add([
          '${i + 1}',
          student.name,
          student.nis,
          ...statuses,
          '$hadir',
          '$sakit',
          '$izin',
          '$alpa',
          '$pct%',
        ]);
      }

      rows.add([]);
      rows.add(['Keterangan: H=Hadir, S=Sakit, I=Izin, A=Alpa']);

      await _saveCsvAndOpen(rows, 'Rekap_Absensi_$className');
    } catch (e) {
      debugPrint('Error generating attendance report: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membuat laporan: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      setState(() => _isGenerating = false);
    }
  }

  // ── Generate Grades Report ────────────────────────────────────

  Future<void> _generateGradesReport(HomeProvider home) async {
    setState(() => _isGenerating = true);

    try {
      final className = home.classes
          .firstWhere((c) => c.id == _selectedClassId,
              orElse: () => ClassModel(id: '', name: 'Kelas'))
          .name;

      final dateFormat = DateFormat('dd/MM/yyyy');

      // Group grades by category+assignmentName+date
      final Set<String> categories = {};
      final Map<String, Map<String, Map<String, dynamic>>> gradeMatrix = {};

      for (var grade in _gradesData) {
        final category = grade['category'] as String? ?? 'Tugas';
        final assignmentName = grade['assignmentName'] as String? ?? '';
        final date = (grade['date'] as Timestamp?)?.toDate() ?? DateTime.now();
        final dateStr = dateFormat.format(date);
        final colKey = '$category - $assignmentName ($dateStr)';
        categories.add(colKey);

        final studentId = grade['studentId'] as String? ?? '';
        final score = grade['score'] ?? 0;

        gradeMatrix.putIfAbsent(studentId, () => {});
        gradeMatrix[studentId]![colKey] = {
          'score': score,
          'date': dateStr,
        };
      }

      final sortedCats = categories.toList()..sort();

      // Build CSV
      final List<List<String>> rows = [];
      rows.add(['REKAP NILAI - $className']);
      rows.add(['Dicetak: ${DateFormat('dd MMMM yyyy, HH:mm', 'id').format(DateTime.now())}']);
      rows.add([]);
      rows.add([
        'No',
        'Nama Siswa',
        'NIS',
        ...sortedCats,
        'Rata-rata',
      ]);

      for (var i = 0; i < _students.length; i++) {
        final student = _students[i];
        int totalScore = 0, count = 0;
        final scores = <String>[];

        for (var cat in sortedCats) {
          final data = gradeMatrix[student.id]?[cat];
          if (data != null) {
            scores.add('${data['score']}');
            totalScore += (data['score'] as num).toInt();
            count++;
          } else {
            scores.add('-');
          }
        }

        final avg = count > 0 ? (totalScore / count).round() : 0;

        rows.add([
          '${i + 1}',
          student.name,
          student.nis,
          ...scores,
          count > 0 ? '$avg' : '-',
        ]);
      }

      await _saveCsvAndOpen(rows, 'Rekap_Nilai_$className');
    } catch (e) {
      debugPrint('Error generating grades report: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membuat laporan: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      setState(() => _isGenerating = false);
    }
  }

  // ── Generate Full Report ──────────────────────────────────────

  Future<void> _generateFullReport(HomeProvider home) async {
    setState(() => _isGenerating = true);

    try {
      final className = home.classes
          .firstWhere((c) => c.id == _selectedClassId,
              orElse: () => ClassModel(id: '', name: 'Kelas'))
          .name;

      final dateFormat = DateFormat('dd/MM/yyyy');
      final now = DateTime.now();
      final printDate = DateFormat('dd MMMM yyyy, HH:mm', 'id').format(now);

      // ── ATTENDANCE SECTION ──
      final Map<String, Map<String, String>> attMatrix = {};
      final Set<String> allDates = {};
      final Map<String, String> dateSubjects = {};

      for (var att in _attendanceData) {
        final date = (att['date'] as Timestamp?)?.toDate() ?? DateTime.now();
        final dateStr = dateFormat.format(date);
        allDates.add(dateStr);

        final subjectId = att['subjectId'] as String? ?? '';
        final subjectName = home.subjects
            .firstWhere((s) => s.id == subjectId,
                orElse: () => SubjectModel(id: '', name: '-'))
            .name;
        dateSubjects[dateStr] = subjectName;

        final records = att['records'] as List<dynamic>? ?? [];
        for (var rec in records) {
          final studentId = rec['studentId'] as String? ?? '';
          final status = rec['status'] as String? ?? '-';
          attMatrix.putIfAbsent(studentId, () => {});
          attMatrix[studentId]![dateStr] = status;
        }
      }

      final sortedDates = allDates.toList()
        ..sort((a, b) => dateFormat.parse(a).compareTo(dateFormat.parse(b)));

      // ── GRADES SECTION ──
      final Set<String> gradeColumns = {};
      final Map<String, Map<String, dynamic>> gradeMatrix = {};

      for (var grade in _gradesData) {
        final category = grade['category'] as String? ?? 'Tugas';
        final assignmentName = grade['assignmentName'] as String? ?? '';
        final date = (grade['date'] as Timestamp?)?.toDate() ?? DateTime.now();
        final dateStr = dateFormat.format(date);
        final colKey = '$category - $assignmentName ($dateStr)';
        gradeColumns.add(colKey);

        final studentId = grade['studentId'] as String? ?? '';
        final score = grade['score'] ?? 0;

        gradeMatrix.putIfAbsent(studentId, () => {});
        gradeMatrix[studentId]![colKey] = score;
      }

      final sortedGradeCols = gradeColumns.toList()..sort();

      // ── BUILD CSV ──
      final List<List<String>> rows = [];
      rows.add(['LAPORAN LENGKAP SISWA - $className']);
      rows.add(['Dicetak: $printDate']);
      rows.add([]);

      // Header row
      rows.add([
        'No',
        'Nama Siswa',
        'NIS',
        // Attendance date columns
        ...sortedDates.map((d) => 'Absensi $d'),
        'Total Hadir',
        '% Kehadiran',
        // Grade columns
        ...sortedGradeCols,
        'Rata-rata Nilai',
      ]);

      for (var i = 0; i < _students.length; i++) {
        final student = _students[i];

        // Attendance stats
        int hadir = 0, totalAtt = 0;
        final attStatuses = <String>[];
        for (var dateStr in sortedDates) {
          final status = attMatrix[student.id]?[dateStr] ?? '-';
          attStatuses.add(status.toUpperCase().substring(0, 1));
          if (status != '-') totalAtt++;
          if (status == 'hadir') hadir++;
        }
        final attPct = totalAtt > 0 ? ((hadir / totalAtt) * 100).round() : 0;

        // Grade stats
        int totalScore = 0, gradeCount = 0;
        final gradeValues = <String>[];
        for (var col in sortedGradeCols) {
          final score = gradeMatrix[student.id]?[col];
          if (score != null) {
            gradeValues.add('$score');
            totalScore += (score as num).toInt();
            gradeCount++;
          } else {
            gradeValues.add('-');
          }
        }
        final gradeAvg = gradeCount > 0 ? (totalScore / gradeCount).round() : 0;

        rows.add([
          '${i + 1}',
          student.name,
          student.nis,
          ...attStatuses,
          '$hadir',
          '$attPct%',
          ...gradeValues,
          gradeCount > 0 ? '$gradeAvg' : '-',
        ]);
      }

      rows.add([]);
      rows.add(['Keterangan Absensi: H=Hadir, S=Sakit, I=Izin, A=Alpa']);

      await _saveCsvAndOpen(rows, 'Laporan_Lengkap_$className');
    } catch (e) {
      debugPrint('Error generating full report: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membuat laporan: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      setState(() => _isGenerating = false);
    }
  }

  // ── Save Excel & Open ─────────────────────────────────────────

  Future<void> _saveCsvAndOpen(List<List<String>> rows, String filePrefix) async {
    final dateStr = DateFormat('yyyyMMdd_HHmm').format(DateTime.now());
    final fileName = '${filePrefix}_$dateStr.xlsx';

    // Create Excel workbook
    final excel = xl.Excel.createExcel();
    final sheet = excel['Laporan'];
    // Remove default Sheet1
    excel.delete('Sheet1');

    for (var rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      final row = rows[rowIdx];
      for (var colIdx = 0; colIdx < row.length; colIdx++) {
        final cellValue = row[colIdx];
        sheet.cell(xl.CellIndex.indexByColumnRow(columnIndex: colIdx, rowIndex: rowIdx)).value = xl.TextCellValue(cellValue);
      }
    }

    // Save to app's own documents directory (no permission needed)
    final dir = await getApplicationDocumentsDirectory();
    final filePath = '${dir.path}/$fileName';
    final fileBytes = excel.encode();
    if (fileBytes == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal membuat file Excel'), backgroundColor: AppColors.error),
        );
      }
      return;
    }
    await File(filePath).writeAsBytes(fileBytes);

    // Share the file so the user can open it in any app
    try {
      await Share.shareXFiles(
        [XFile(filePath)],
        text: 'Laporan: $fileName',
      );
    } catch (e) {
      debugPrint('Error sharing file: $e');
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Berhasil: $fileName'),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  // ── UI Widgets ────────────────────────────────────────────────

  Widget _buildSummaryCard(IconData icon, String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDownloadTile({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: _isGenerating ? null : onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 22, color: color),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.primaryMuted,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.download_rounded, size: 18, color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}
