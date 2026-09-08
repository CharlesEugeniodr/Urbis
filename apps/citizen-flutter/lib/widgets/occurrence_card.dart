import 'package:flutter/material.dart';
import '../core/theme.dart';
import 'status_badge.dart';

class OccurrenceCard extends StatelessWidget {
  final String id;
  final String category;
  final String status;
  final String date;
  final VoidCallback onTap;

  const OccurrenceCard({super.key, required this.id, required this.category, required this.status, required this.date, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.getCategoryColor(category).withOpacity(0.2),
          child: Icon(AppTheme.getCategoryIcon(category), color: AppTheme.getCategoryColor(category)),
        ),
        title: Text('Protocolo: $id'),
        subtitle: Text(date),
        trailing: StatusBadge(status: status),
        onTap: onTap,
      ),
    );
  }
}
