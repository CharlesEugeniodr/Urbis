import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color c;
    switch(status) {
      case 'RESOLVED': c = Colors.green; break;
      case 'DISPATCHED': c = Colors.blue; break;
      default: c = Colors.orange;
    }
    return Chip(
      label: Text(status, style: const TextStyle(color: Colors.white, fontSize: 12)),
      backgroundColor: c,
    );
  }
}
