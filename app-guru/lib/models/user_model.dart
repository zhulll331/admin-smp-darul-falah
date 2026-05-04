class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final bool isActive;
  final List<String> subjectIds;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.isActive = true,
    this.subjectIds = const [],
  });

  factory UserModel.fromMap(Map<String, dynamic> data, String documentId) {
    return UserModel(
      id: documentId,
      name: data['name'] ?? '',
      email: data['email'] ?? '',
      role: data['role'] ?? 'guru',
      isActive: data['isActive'] ?? true,
      subjectIds: List<String>.from(data['subjectIds'] ?? []),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      'role': role,
      'isActive': isActive,
      'subjectIds': subjectIds,
    };
  }
}
