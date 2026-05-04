import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../providers/auth_provider.dart';
import '../providers/home_provider.dart';
import '../utils/colors.dart';
import '../models/core_models.dart';
import '../widgets/animated_page_route.dart';
import 'attendance_screen.dart';

class AttendanceHubScreen extends StatefulWidget {
  const AttendanceHubScreen({super.key});

  @override
  State<AttendanceHubScreen> createState() => _AttendanceHubScreenState();
}

class _AttendanceHubScreenState extends State<AttendanceHubScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _recentRecords = [];
  int _todayCount = 0;
  int _weekCount = 0;
  int _totalHadir = 0;
  int _totalRecords = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    final home = context.read<HomeProvider>();
    final user = auth.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);

    try {
      final firestore = FirebaseFirestore.instance;
      final snap = await firestore
          .collection('attendance')
          .where('teacherId', isEqualTo: user.id)
          .get();

      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final weekAgo = today.subtract(const Duration(days: 7));

      int todayCount = 0;
      int weekCount = 0;
      int totalHadir = 0;
      int totalRecords = 0;
      final List<Map<String, dynamic>> records = [];

      for (var doc in snap.docs) {
        final data = doc.data();
        final date = (data['date'] as Timestamp?)?.toDate() ?? DateTime.now();
        final recList = data['records'] as List<dynamic>? ?? [];

        totalRecords += recList.length;
        totalHadir += recList.where((r) => r['status'] == 'hadir').length;

        if (date.isAfter(today) || date.isAtSameMomentAs(today)) {
          todayCount++;
        }
        if (date.isAfter(weekAgo)) {
          weekCount++;
        }

        // Find class & subject names
        final classId = data['classId'] as String? ?? '';
        final subjectId = data['subjectId'] as String? ?? '';
        final className = home.classes
            .firstWhere((c) => c.id == classId, orElse: () => ClassModel(id: '', name: classId))
            .name;
        final subjectName = home.subjects
            .firstWhere((s) => s.id == subjectId, orElse: () => SubjectModel(id: '', name: subjectId))
            .name;

        records.add({
          'date': date,
          'className': className,
          'subjectName': subjectName,
          'hadirCount': recList.where((r) => r['status'] == 'hadir').length,
          'totalStudents': recList.length,
          'sakitCount': recList.where((r) => r['status'] == 'sakit').length,
          'izinCount': recList.where((r) => r['status'] == 'izin').length,
          'alpaCount': recList.where((r) => r['status'] == 'alpa').length,
        });
      }

      // Sort by date descending
      records.sort((a, b) => (b['date'] as DateTime).compareTo(a['date'] as DateTime));

      setState(() {
        _recentRecords = records;
        _todayCount = todayCount;
        _weekCount = weekCount;
        _totalHadir = totalHadir;
        _totalRecords = totalRecords;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading attendance hub: $e');
      setState(() => _isLoading = false);
    }
  }

  void _startNewSession() {
    final home = context.read<HomeProvider>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Consumer<HomeProvider>(
          builder: (context, home, child) {
            return Container(
              padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(ctx).padding.bottom + 24),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40, height: 4,
                      decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(4)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text('Sesi Baru', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  Text(
                    home.hasMultipleSubjects
                        ? 'Pilih kelas dan mata pelajaran.'
                        : 'Pilih kelas untuk memulai absensi.',
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 24),

                  if (!home.hasMultipleSubjects && home.selectedSubject != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(color: AppColors.primaryMuted, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          const Icon(Icons.auto_stories_rounded, size: 18, color: AppColors.primary),
                          const SizedBox(width: 10),
                          Text('Mapel: ${home.selectedSubject!.name}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.primary)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  const Text('Kelas', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<ClassModel>(
                    decoration: InputDecoration(
                      hintText: 'Pilih Kelas',
                      filled: true,
                      fillColor: AppColors.surfaceGrey,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    initialValue: home.selectedClass,
                    items: home.classes.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                    onChanged: (val) => home.selectClass(val),
                  ),

                  if (home.hasMultipleSubjects) ...[
                    const SizedBox(height: 16),
                    const Text('Mata Pelajaran', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<SubjectModel>(
                      decoration: InputDecoration(
                        hintText: 'Pilih Mata Pelajaran',
                        filled: true,
                        fillColor: AppColors.surfaceGrey,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                      initialValue: home.selectedSubject,
                      items: home.subjects.map((s) => DropdownMenuItem(value: s, child: Text(s.name))).toList(),
                      onChanged: (val) => home.selectSubject(val),
                    ),
                  ],

                  const SizedBox(height: 32),
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      onPressed: home.canStartSession
                          ? () {
                              Navigator.pop(ctx);
                              Navigator.push(context, FadePageRoute(page: const AttendanceScreen())).then((_) => _loadData());
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Mulai Sesi Absensi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final d = DateTime(date.year, date.month, date.day);
    
    if (d == today) return 'Hari Ini';
    if (d == today.subtract(const Duration(days: 1))) return 'Kemarin';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final attendancePct = _totalRecords > 0 ? ((_totalHadir / _totalRecords) * 100).round() : 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Pusat Absensi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Stat cards row
                    Row(
                      children: [
                        _buildStatCard('Hari Ini', '$_todayCount', 'sesi', Icons.today_rounded, Colors.blue),
                        const SizedBox(width: 12),
                        _buildStatCard('Minggu Ini', '$_weekCount', 'sesi', Icons.date_range_rounded, Colors.orange),
                        const SizedBox(width: 12),
                        _buildStatCard('Kehadiran', '$attendancePct%', 'rata-rata', Icons.trending_up_rounded, Colors.green),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // New Session button
                    InkWell(
                      onTap: _startNewSession,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 48, height: 48,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Sesi Absensi Baru', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                                  const SizedBox(height: 4),
                                  Text('Catat kehadiran & jurnal mengajar', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12)),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_rounded, color: Colors.white),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Recent records header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('RIWAYAT ABSENSI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 1.0)),
                        Text('${_recentRecords.length} Catatan', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (_recentRecords.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(40),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          children: const [
                            Icon(Icons.how_to_reg_rounded, size: 56, color: AppColors.textMuted),
                            SizedBox(height: 16),
                            Text('Belum ada riwayat absensi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
                            SizedBox(height: 8),
                            Text('Mulai sesi baru dengan menekan tombol di atas', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                          ],
                        ),
                      )
                    else
                      ..._recentRecords.take(20).map((record) {
                        final date = record['date'] as DateTime;
                        final className = record['className'] as String;
                        final subjectName = record['subjectName'] as String;
                        final hadirCount = record['hadirCount'] as int;
                        final totalStudents = record['totalStudents'] as int;
                        final sakitCount = record['sakitCount'] as int;
                        final izinCount = record['izinCount'] as int;
                        final alpaCount = record['alpaCount'] as int;
                        final pct = totalStudents > 0 ? ((hadirCount / totalStudents) * 100).round() : 0;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(className, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                        const SizedBox(height: 2),
                                        Text(subjectName, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: pct >= 80
                                          ? Colors.green.shade50
                                          : pct >= 60
                                              ? Colors.orange.shade50
                                              : Colors.red.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '$pct%',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: pct >= 80
                                            ? Colors.green.shade700
                                            : pct >= 60
                                                ? Colors.orange.shade700
                                                : Colors.red.shade700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Icon(Icons.calendar_today_rounded, size: 12, color: AppColors.textMuted),
                                  const SizedBox(width: 6),
                                  Text(_formatDate(date), style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  const SizedBox(width: 16),
                                  Icon(Icons.people_rounded, size: 12, color: AppColors.textMuted),
                                  const SizedBox(width: 6),
                                  Text('$hadirCount/$totalStudents hadir', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                ],
                              ),
                              if (sakitCount > 0 || izinCount > 0 || alpaCount > 0) ...[
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  children: [
                                    if (sakitCount > 0)
                                      _buildMiniChip('Sakit: $sakitCount', Colors.blue),
                                    if (izinCount > 0)
                                      _buildMiniChip('Izin: $izinCount', Colors.orange),
                                    if (alpaCount > 0)
                                      _buildMiniChip('Alpa: $alpaCount', Colors.red),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatCard(String title, String value, String subtitle, IconData icon, Color color) {
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
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(title, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color.withValues(alpha: 0.8))),
    );
  }
}
