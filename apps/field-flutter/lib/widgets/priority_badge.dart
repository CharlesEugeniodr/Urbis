import 'package:flutter/material.dart';

class PriorityBadge extends StatelessWidget {
  final int priority;

  const PriorityBadge({super.key, required this.priority});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (priority) {
      case 1:
        color = Colors.red;
        label = 'P1';
        break;
      case 2:
        color = Colors.orange;
        label = 'P2';
        break;
      case 3:
        color = Colors.yellow[700]!;
        label = 'P3';
        break;
      default:
        color = Colors.green;
        label = 'P4';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }
}
