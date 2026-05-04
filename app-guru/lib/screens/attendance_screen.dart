import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/home_provider.dart';
import '../providers/attendance_provider.dart';
import '../utils/colors.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final _journalController = TextEditingController();
  int _selectedJP = 1;
  DateTime _selectedDate = DateTime.now();

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
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
      setState(() => _selectedDate = picked);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final home = context.read<HomeProvider>();
      if (home.selectedClass != null) {
        context.read<AttendanceProvider>().loadStudents(home.selectedClass!.id);
      }
    });
  }

  void _handleSubmit() async {
    final home = context.read<HomeProvider>();
    final auth = context.read<AuthProvider>();
    final attendance = context.read<AttendanceProvider>();

    final error = await attendance.submitSession(
      guru: auth.currentUser!,
      cls: home.selectedClass!,
      subj: home.selectedSubject!,
      journalEntry: _journalController.text,
      jamPelajaran: _selectedJP,
      sessionDate: _selectedDate,
    );

    if (!mounted) return;

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: AppColors.error));
    } else {
      home.clearSelection();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sesi berhasil disimpan! Tersinkronisasi ke Cloud.'), backgroundColor: AppColors.primary));
      Navigator.pop(context); // Go back to Home
    }
  }

  void _markAllPresent(AttendanceProvider attendance) {
    for (var student in attendance.students) {
      attendance.updateStatus(student.id, 'Hadir');
    }
  }

  @override
  Widget build(BuildContext context) {
    final home = context.watch<HomeProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final cls = home.selectedClass;
    final subj = home.selectedSubject;

    if (cls == null || subj == null) return const Scaffold();

    final totalCount = attendance.students.length;
    final hadirCount = attendance.students.where((s) {
      final status = attendance.attendanceStatus[s.id] ?? 'Hadir';
      return status == 'Hadir';
    }).length;
    final double percentage = totalCount == 0 ? 0 : (hadirCount / totalCount) * 100;
    
    // Formatting Class name like "7A" from "7A - Matematika" if applicable
    final clsNameDisplay = cls.name.split('-')[0].trim();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Akademik Darul Falah', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary)),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.notifications_rounded, color: AppColors.primary), onPressed: () {}),
        ],
      ),
      body: attendance.isLoading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('SESI AKADEMIK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 1.0)),
                    InkWell(
                      onTap: _pickDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primaryMuted,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.primary),
                            const SizedBox(width: 6),
                            Text(
                              "${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}",
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Absensi & Jurnal - $clsNameDisplay', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.primary, letterSpacing: -0.5)),
                
                const SizedBox(height: 24),
                
                // Top Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.primaryMuted,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('STATUS KEHADIRAN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: 0.5)),
                          const SizedBox(height: 4),
                          Text('$hadirCount/$totalCount Siswa Hadir', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.primaryMuted,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Text('${percentage.toStringAsFixed(0)}%', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 32),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('DAFTAR SISWA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 1.0)),
                    InkWell(
                      onTap: () => _markAllPresent(attendance),
                      child: Row(
                        children: const [
                          Icon(Icons.check_rounded, size: 16, color: AppColors.primary),
                          SizedBox(width: 4),
                          Text('HADIR SEMUA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary, letterSpacing: 0.5)),
                        ],
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Student Directory
                ...attendance.students.map((student) {
                  final status = attendance.attendanceStatus[student.id] ?? 'Hadir';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(child: Text(student.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
                            if (status == 'Hadir')
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text('TERVERIFIKASI', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.green.shade700)),
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            _buildStatusPill(attendance, student.id, 'Hadir', status),
                            const SizedBox(width: 8),
                            _buildStatusPill(attendance, student.id, 'Sakit', status),
                            const SizedBox(width: 8),
                            _buildStatusPill(attendance, student.id, 'Izin', status),
                            const SizedBox(width: 8),
                            _buildStatusPill(attendance, student.id, 'Alpa', status),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
                
                const SizedBox(height: 32),
                const Text('JURNAL MENGAJAR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 1.0)),
                const SizedBox(height: 16),
                
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Jurnal Mengajar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      const SizedBox(height: 16),
                      const Text('Jumlah Jam Pelajaran (JP)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
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
                            items: [1, 2, 3, 4, 5, 6].map((jp) {
                              return DropdownMenuItem<int>(
                                value: jp,
                                child: Text('$jp Jam Pelajaran', style: const TextStyle(fontSize: 14)),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedJP = val);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text('Tuliskan ringkasan materi, tujuan pembelajaran, atau catatan khusus tentang kelas hari ini.', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _journalController,
                        maxLines: 4,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'Contoh: Mengajarkan persamaan kuadrat dan memberikan kuis singkat...',
                          hintStyle: TextStyle(color: AppColors.textMuted.withValues(alpha: 0.8)),
                          filled: true,
                          fillColor: AppColors.surfaceGrey,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 60), // Extra space for bottom button
              ],
            ),
          ),
          
          // Bottom button
          Positioned(
            left: 20,
            right: 20,
            bottom: 24,
            child: SizedBox(
              height: 56,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  elevation: 8,
                  shadowColor: AppColors.primary.withValues(alpha: 0.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: attendance.isSubmitting ? null : _handleSubmit,
                child: attendance.isSubmitting 
                  ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.save_rounded, color: Colors.white),
                      SizedBox(width: 12),
                      Text('Simpan Kehadiran & Jurnal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusPill(AttendanceProvider attendance, String studentId, String label, String currentStatus) {
    bool isSelected = label == currentStatus;
    Color bgColor = isSelected ? AppColors.primary : AppColors.surfaceGrey;
    Color textColor = isSelected ? Colors.white : AppColors.textPrimary;
    
    return Expanded(
      child: InkWell(
        onTap: () => attendance.updateStatus(studentId, label),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Center(
            child: Text(
              label.toUpperCase(),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: textColor,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

