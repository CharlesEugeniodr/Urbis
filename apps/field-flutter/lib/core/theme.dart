import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(0xFF07507C);
  static const Color accent = Color(0xFFFF8C00);

  static Color getStatusColor(String status) {
    switch (status) {
      case 'PENDING': return Colors.grey;
      case 'EN_ROUTE': return Colors.blue;
      case 'ARRIVED': return Colors.orange;
      case 'IN_PROGRESS': return Colors.amber;
      case 'COMPLETED': return Colors.green;
      default: return Colors.grey;
    }
  }

  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    colorSchemeSeed: primary,
    appBarTheme: const AppBarTheme(
      backgroundColor: primary,
      foregroundColor: Colors.white,
    ),
  );
}
