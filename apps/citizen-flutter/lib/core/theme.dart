import 'package:flutter/material.dart';

class AppTheme {
  static const primaryColor = Color(0xFF07507C);
  static const secondaryColor = Color(0xFF2E8B57);

  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      primary: primaryColor,
      secondary: secondaryColor,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: primaryColor,
      foregroundColor: Colors.white,
    ),
  );

  static Color getCategoryColor(String category) {
    switch (category) {
      case 'LIGHTING': return Colors.amber;
      case 'TRAFFIC_SIGNAL': return Colors.red;
      case 'WATER': return Colors.blue;
      case 'ENERGY': return Colors.orange;
      case 'PAVEMENT': return Colors.brown;
      case 'RESILIENCE': return Colors.green;
      default: return Colors.grey;
    }
  }

  static IconData getCategoryIcon(String category) {
    switch (category) {
      case 'LIGHTING': return Icons.lightbulb;
      case 'TRAFFIC_SIGNAL': return Icons.traffic;
      case 'WATER': return Icons.water_drop;
      case 'ENERGY': return Icons.bolt;
      case 'PAVEMENT': return Icons.warning;
      case 'RESILIENCE': return Icons.shield;
      default: return Icons.help;
    }
  }
}
