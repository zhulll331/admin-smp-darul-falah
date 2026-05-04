class ClassModel {
  final String id;
  final String name;
  final int? grade;
  final String? academicYear;

  ClassModel({
    required this.id,
    required this.name,
    this.grade,
    this.academicYear,
  });

  factory ClassModel.fromMap(Map<String, dynamic> data, String documentId) {
    // Safely parse grade — web admin may store as String or int
    int? parsedGrade;
    final rawGrade = data['grade'];
    if (rawGrade is int) {
      parsedGrade = rawGrade;
    } else if (rawGrade is String) {
      parsedGrade = int.tryParse(rawGrade);
    }

    return ClassModel(
      id: documentId,
      name: data['name']?.toString() ?? '',
      grade: parsedGrade,
      academicYear: data['academicYear']?.toString(),
    );
  }
}

class SubjectModel {
  final String id;
  final String name;
  final String? code;

  SubjectModel({
    required this.id,
    required this.name,
    this.code,
  });

  factory SubjectModel.fromMap(Map<String, dynamic> data, String documentId) {
    return SubjectModel(
      id: documentId,
      name: data['name']?.toString() ?? '',
      code: data['code']?.toString(),
    );
  }
}

class StudentModel {
  final String id;
  final String name;
  final String nis;
  final String classId;
  final String gender;

  StudentModel({
    required this.id,
    required this.name,
    required this.nis,
    required this.classId,
    required this.gender,
  });

  factory StudentModel.fromMap(Map<String, dynamic> data, String documentId) {
    return StudentModel(
      id: documentId,
      name: data['name']?.toString() ?? '',
      nis: data['nis']?.toString() ?? '',
      classId: data['classId']?.toString() ?? '',
      gender: data['gender']?.toString() ?? 'L',
    );
  }
}
