import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../screens/work_order_detail_screen.dart';
import 'priority_badge.dart';

class WorkOrderCard extends StatelessWidget {
  final Map<String, dynamic> order;

  const WorkOrderCard({super.key, required this.order});

  IconData _getCategoryIcon(String? category) {
    switch (category) {
      case 'LIGHTING': return Icons.lightbulb;
      case 'TRAFFIC_SIGNAL': return Icons.traffic;
      case 'WATER': return Icons.water_drop;
      case 'ENERGY': return Icons.bolt;
      case 'PAVEMENT': return Icons.warning;
      case 'RESILIENCE': return Icons.shield;
      default: return Icons.assignment;
    }
  }

  @override
  Widget build(BuildContext context) {
    final occurrence = order['occurrence'] ?? {};
    final status = order['status'] ?? 'PENDING';
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => WorkOrderDetailScreen(order: order)));
        },
        child: Container(
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: AppTheme.getStatusColor(status), width: 6)),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(_getCategoryIcon(occurrence['categoryCode']), color: Colors.grey[700]),
                      const SizedBox(width: 8),
                      Text('OS ${order['id']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  PriorityBadge(priority: order['priority'] ?? 1),
                ],
              ),
              const SizedBox(height: 8),
              Text(occurrence['address'] ?? 'Sem endereço', style: const TextStyle(color: Colors.black87)),
              const SizedBox(height: 8),
              Text('Status: $status', style: TextStyle(color: AppTheme.getStatusColor(status), fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}
