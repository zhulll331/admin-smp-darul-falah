import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/home_provider.dart';
import '../providers/grades_provider.dart';
import '../models/core_models.dart';
import '../utils/colors.dart';

class GradesScreen extends StatefulWidget {
  const GradesScreen({super.key});

  @override
  State<GradesScreen> createState() => _GradesScreenState();
}

class _GradesScreenState extends State<GradesScreen> {
  final _assignmentNameController = TextEditingController();
  bool _isSessionStarted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final home = context.read<HomeProvider>();
      if (home.selectedClass != null && home.selectedSubject != null) {
        _isSessionStarted = true;
      }
      if (home.selectedClass != null) {
        context.read<GradesProvider>().loadStudents(home.selectedClass!.id);
      }
    });
  }

  @override
  void dispose() {
    _assignmentNameController.dispose();
    super.dispose();
  }

  void _handleSaveGrades() async {
    final home = context.read<HomeProvider>();
    final auth = context.read<AuthProvider>();
    final grades = context.read<GradesProvider>();

    if (home.selectedClass == null || home.selectedSubject == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih kelas dan mata pelajaran terlebih dahulu.')));
      return;
    }

    final error = await grades.submitGrades(
      guru: auth.currentUser!,
      cls: home.selectedClass!,
      subj: home.selectedSubject!,
      assignmentName: _assignmentNameController.text,
    );

    if (!mounted) return;

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: AppColors.error));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nilai berhasil disimpan & disinkronisasikan!'), backgroundColor: AppColors.primary));
      _assignmentNameController.clear();
      setState(() {
        _isSessionStarted = false; // Reset session
      });
      home.clearSelection();
    }
  }

  @override
  Widget build(BuildContext context) {
    final home = context.watch<HomeProvider>();
    final grades = context.watch<GradesProvider>();
    final auth = context.watch<AuthProvider>();

    final cls = home.selectedClass;
    final subj = home.selectedSubject;

    // If session hasn't started or missing data, show selector UI
    if (!_isSessionStarted || cls == null || subj == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent, elevation: 0,
          title: const Text('Input Nilai', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
          centerTitle: false,
        ),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: SingleChildScrollView(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(home.hasMultipleSubjects ? 'PILIH KELAS & MAPEL' : 'PILIH KELAS', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white70, letterSpacing: 1.0)),
                  const SizedBox(height: 8),
                  const Text('Mulai Input Nilai', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text(
                    home.hasMultipleSubjects
                      ? 'Pilih kelas dan mata pelajaran untuk memulai penilaian siswa.'
                      : 'Pilih kelas untuk memulai penilaian siswa.',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13),
                  ),
                  const SizedBox(height: 24),

                  // Show auto-selected subject info if single subject
                  if (!home.hasMultipleSubjects && home.selectedSubject != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.primaryMuted,
                        borderRadius: BorderRadius.circular(12),
                      ),
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

                  const Text('Kelas', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.white)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<ClassModel>(
                    decoration: InputDecoration(
                      hintText: 'Pilih Kelas',
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    initialValue: home.selectedClass,
                    items: home.classes.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                    onChanged: (val) {
                      home.selectClass(val);
                      if (val != null) {
                        grades.loadStudents(val.id);
                      }
                    },
                  ),

                // Only show subject dropdown if teacher has multiple subjects
                if (home.hasMultipleSubjects) ...[
                  const SizedBox(height: 16),
                  const Text('Mata Pelajaran', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<SubjectModel>(
                    decoration: InputDecoration(
                      hintText: 'Pilih Mata Pelajaran',
                      filled: true,
                      fillColor: Colors.white,
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
                    onPressed: home.canStartSession ? () {
                      setState(() {
                        _isSessionStarted = true;
                      });
                    } : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Mulai Input Nilai', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
        ),
      );
    }

    final subjNameDisplay = subj.name;
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Input Nilai - $subjNameDisplay', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(icon: const Icon(Icons.notifications_rounded, color: AppColors.primary), onPressed: () {}),
        ],
        leading: Navigator.canPop(context) 
          ? IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: AppColors.primary),
              onPressed: () => Navigator.pop(context),
            )
          : IconButton(
              icon: const Icon(Icons.close_rounded, color: AppColors.primary),
              onPressed: () {
                setState(() => _isSessionStarted = false);
                home.clearSelection();
              },
            ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Selection Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('PENILAIAN SAAT INI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white70, letterSpacing: 1.0)),
                      const SizedBox(height: 8),
                      Text('${cls.name} – $subjNameDisplay', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 16),
                      
                      const Text('KATEGORI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white70, letterSpacing: 1.0)),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.white.withValues(alpha: 0.15),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                        dropdownColor: AppColors.primaryLight,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white),
                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500),
                        initialValue: grades.selectedCategory,
                        items: grades.categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                        onChanged: (val) {
                          if (val != null) grades.setCategory(val);
                        },
                      ),
                      
                      const SizedBox(height: 20),
                      const Text('NAMA TUGAS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white70, letterSpacing: 1.0)),
                      const SizedBox(height: 8),
                      
                      TextField(
                        controller: _assignmentNameController,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                        decoration: InputDecoration(
                          hintText: 'Contoh: Kuis Aljabar 1',
                          hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                          filled: true,
                          fillColor: Colors.white.withValues(alpha: 0.15),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 32),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Lembar Nilai Kelas', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
                        const SizedBox(height: 4),
                        Text('Kelas: ${cls.name}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 0.5)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text('${grades.students.length} Siswa', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green.shade700)),
                    ),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                if (grades.isLoading)
                   const Center(child: CircularProgressIndicator())
                else if (grades.students.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: const [
                        Icon(Icons.people_outline_rounded, size: 48, color: AppColors.textMuted),
                        SizedBox(height: 12),
                        Text('Belum ada siswa di kelas ini', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        SizedBox(height: 4),
                        Text('Tambahkan siswa melalui web admin.', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      ],
                    ),
                  )
                else
                  ...grades.students.map((student) {
                    final initials = student.name.split(' ').take(2).map((e) => e.isNotEmpty ? e[0].toUpperCase() : '').join('');
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.primaryMuted,
                            child: Text(initials, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(student.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppColors.textPrimary)),
                                const SizedBox(height: 2),
                                Text('NIS: ${student.nis}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          SizedBox(
                            width: 60,
                            child: TextField(
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)],
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                              decoration: InputDecoration(
                                hintText: '0',
                                filled: true,
                                fillColor: AppColors.surfaceGrey,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              onChanged: (val) {
                                final score = int.tryParse(val) ?? 0;
                                grades.updateGrade(student.id, score > 100 ? 100 : score);
                              },
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  
                const SizedBox(height: 60),
              ],
            ),
          ),
          
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
                onPressed: grades.isSubmitting ? null : _handleSaveGrades,
                child: grades.isSubmitting
                  ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.save_rounded, color: Colors.white),
                      SizedBox(width: 12),
                      Text('Simpan Nilai', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
