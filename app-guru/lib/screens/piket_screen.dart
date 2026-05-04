import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/piket_provider.dart';
import '../utils/colors.dart';

class PiketScreen extends StatefulWidget {
  const PiketScreen({super.key});

  @override
  State<PiketScreen> createState() => _PiketScreenState();
}

class _PiketScreenState extends State<PiketScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _laporanController = TextEditingController();
  int _selectedJP = 1;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PiketProvider>().loadInitialData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _laporanController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final piket = context.read<PiketProvider>();
    final picked = await showDatePicker(
      context: context,
      initialDate: piket.selectedDate,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      piket.setDate(picked);
    }
  }

  void _handleSaveStudentAttendance() async {
    final piket = context.read<PiketProvider>();
    final error = await piket.submitStudentAttendance();
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: AppColors.error));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Absensi siswa berhasil disimpan! ✓'), backgroundColor: AppColors.primary));
    }
  }

  void _handleSaveTeacherAttendance() async {
    final piket = context.read<PiketProvider>();
    final error = await piket.submitTeacherAttendance();
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: AppColors.error));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Absensi guru berhasil disimpan! ✓'), backgroundColor: AppColors.primary));
    }
  }

  void _handleSubmitLaporan() async {
    final piket = context.read<PiketProvider>();
    final auth = context.read<AuthProvider>();
    final error = await piket.submitPiketJournal(
      guru: auth.currentUser!,
      laporanPiket: _laporanController.text,
      jamPiket: _selectedJP,
    );
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: AppColors.error));
    } else {
      _laporanController.clear();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Laporan piket berhasil disimpan! ✓'), backgroundColor: AppColors.primary));
    }
  }

  @override
  Widget build(BuildContext context) {
    final piket = context.watch<PiketProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Piket & Monitoring', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
        centerTitle: true,
        actions: [
          InkWell(
            onTap: _pickDate,
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primaryMuted,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    "${piket.selectedDate.day}/${piket.selectedDate.month}/${piket.selectedDate.year}",
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
          tabs: const [
            Tab(text: 'SISWA'),
            Tab(text: 'GURU'),
            Tab(text: 'LAPORAN'),
          ],
        ),
      ),
      body: piket.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildStudentTab(piket),
                _buildTeacherTab(piket),
                _buildLaporanTab(piket),
              ],
            ),
    );
  }

  // ─── TAB 1: ABSENSI SISWA ───
  Widget _buildStudentTab(PiketProvider piket) {
    return Column(
      children: [
        // Class Selector
        Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Pilih Kelas', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: piket.selectedClassId,
                    isExpanded: true,
                    hint: const Text('Pilih Kelas', style: TextStyle(fontSize: 14)),
                    items: piket.classes.map((c) {
                      return DropdownMenuItem<String>(
                        value: c.id,
                        child: Text(c.name, style: const TextStyle(fontSize: 14)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) piket.selectClass(val);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),

        if (piket.selectedClassId != null && !piket.isLoadingStudents) ...[
          // Stats bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryMuted,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${piket.students.where((s) => piket.studentAttendance[s.id] == 'Hadir').length}/${piket.students.length} Hadir',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14),
                ),
                Row(
                  children: [
                    InkWell(
                      onTap: () => piket.markAllStudentsPresent(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('Hadir Semua', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: piket.isSubmitting ? null : _handleSaveStudentAttendance,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.green.shade600,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('Simpan', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],

        if (piket.isLoadingStudents)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else if (piket.selectedClassId == null)
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.school_rounded, size: 48, color: AppColors.textMuted),
                  SizedBox(height: 12),
                  Text('Pilih kelas untuk memulai absensi', style: TextStyle(color: AppColors.textSecondary)),
                ],
              ),
            ),
          )
        else
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              itemCount: piket.students.length,
              itemBuilder: (context, index) {
                final student = piket.students[index];
                final status = piket.studentAttendance[student.id] ?? 'Hadir';
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(student.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _buildPill(status, 'Hadir', () => piket.updateStudentStatus(student.id, 'Hadir')),
                          const SizedBox(width: 6),
                          _buildPill(status, 'Sakit', () => piket.updateStudentStatus(student.id, 'Sakit')),
                          const SizedBox(width: 6),
                          _buildPill(status, 'Izin', () => piket.updateStudentStatus(student.id, 'Izin')),
                          const SizedBox(width: 6),
                          _buildPill(status, 'Alpa', () => piket.updateStudentStatus(student.id, 'Alpa')),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  // ─── TAB 2: ABSENSI GURU ───
  Widget _buildTeacherTab(PiketProvider piket) {
    return Column(
      children: [
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primaryMuted,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${piket.allTeachers.where((t) => piket.teacherAttendance[t.id] == 'Hadir').length}/${piket.allTeachers.length} Hadir',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14),
              ),
              Row(
                children: [
                  InkWell(
                    onTap: () => piket.markAllTeachersPresent(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Hadir Semua', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: piket.isSubmitting ? null : _handleSaveTeacherAttendance,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.green.shade600,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Simpan', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            itemCount: piket.allTeachers.length,
            itemBuilder: (context, index) {
              final teacher = piket.allTeachers[index];
              final status = piket.teacherAttendance[teacher.id] ?? 'Hadir';
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(teacher.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        _buildPill(status, 'Hadir', () => piket.updateTeacherStatus(teacher.id, 'Hadir')),
                        const SizedBox(width: 6),
                        _buildPill(status, 'Sakit', () => piket.updateTeacherStatus(teacher.id, 'Sakit')),
                        const SizedBox(width: 6),
                        _buildPill(status, 'Izin', () => piket.updateTeacherStatus(teacher.id, 'Izin')),
                        const SizedBox(width: 6),
                        _buildPill(status, 'Alpa', () => piket.updateTeacherStatus(teacher.id, 'Alpa')),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ─── TAB 3: LAPORAN PIKET ───
  Widget _buildLaporanTab(PiketProvider piket) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Laporan Piket', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
                const SizedBox(height: 8),
                const Text('Tuliskan ringkasan kegiatan dan kejadian selama piket hari ini.', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),

                const SizedBox(height: 20),
                const Text('Jumlah Jam Piket', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceGrey,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: _selectedJP,
                      isExpanded: true,
                      items: [1, 2, 3, 4, 5, 6, 7, 8].map((jp) {
                        return DropdownMenuItem<int>(
                          value: jp,
                          child: Text('$jp Jam Piket', style: const TextStyle(fontSize: 14)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedJP = val);
                      },
                    ),
                  ),
                ),

                const SizedBox(height: 20),
                const Text('Laporan Kegiatan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 8),
                TextField(
                  controller: _laporanController,
                  maxLines: 6,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Contoh: Upacara bendera berjalan lancar, 3 siswa terlambat, 1 siswa dipulangkan karena sakit...',
                    hintStyle: TextStyle(color: AppColors.textMuted.withValues(alpha: 0.8)),
                    filled: true,
                    fillColor: AppColors.surfaceGrey,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),

                const SizedBox(height: 24),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: piket.isSubmitting ? null : _handleSubmitLaporan,
                    child: piket.isSubmitting
                        ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.save_rounded, color: Colors.white),
                              SizedBox(width: 8),
                              Text('Simpan Laporan Piket', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPill(String currentStatus, String label, VoidCallback onTap) {
    final isSelected = currentStatus == label;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.surfaceGrey,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Center(
            child: Text(
              label.toUpperCase(),
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
