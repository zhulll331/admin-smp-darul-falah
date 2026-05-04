import 'package:flutter/material.dart';

class AppColors {
  // Brand Colors - The Academic Atelier (Dark Teal)
  static const Color primary = Color(0xFF005769); // Dark Teal (Buttons, Headers)
  static const Color primaryLight = Color(0xFF00758F); // Lighter Teal
  static const Color primaryMuted = Color(0xFFE5F0F2); // Pale teal for backgrounds/chips
  
  // Background Colors
  static const Color background = Color(0xFFF7F9FC); // Global app background
  static const Color surface = Colors.white;
  static const Color surfaceElevated = Colors.white;
  static const Color surfaceGrey = Color(0xFFF4F6F8); // Grey background for textfields, cards

  // Text Colors
  static const Color textPrimary = Color(0xFF132A35); // Deep Teal-Tinted Slate
  static const Color textSecondary = Color(0xFF5A707E); // Slate Grey
  static const Color textMuted = Color(0xFF9BAAB3); // Light Slate

  // Status Colors (Based on design)
  static const Color success = Color(0xFF005769); // Using Teal for success/Hadir in new design
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
  
  // Custom Status
  static const Color statusHadir = Color(0xFF005769); // Dark Teal
  static const Color statusSakit = Color(0xFFF4F6F8); // Grey inactive
  static const Color statusIzin = Color(0xFFF4F6F8); // Grey inactive
  static const Color statusAlpa = Color(0xFFF4F6F8); // Grey inactive

  // Decorative
  static const Color divider = Color(0xFFEBEFF2);
  
  // Shadows
  static Color shadowColor = const Color(0xFF001824).withValues(alpha: 0.04);
}
