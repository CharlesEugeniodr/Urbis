import 'package:flutter/material.dart';
import '../core/theme.dart';

class StatusStepper extends StatelessWidget {
  final String currentStatus;
  const StatusStepper({super.key, required this.currentStatus});

  static const _steps = ['PENDING', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
  static const _labels = ['Pendente', 'Em Rota', 'Chegou', 'Em Andamento', 'Concluído'];

  @override
  Widget build(BuildContext context) {
    int currentIndex = _steps.indexOf(currentStatus);
    if (currentIndex == -1) currentIndex = 0;

    return Column(
      children: List.generate(_steps.length, (index) {
        final isCompleted = index < currentIndex;
        final isCurrent = index == currentIndex;
        
        return Row(
          children: [
            Column(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isCompleted ? Colors.green : (isCurrent ? AppTheme.accent : Colors.grey),
                  ),
                  child: isCompleted ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
                ),
                if (index < _steps.length - 1)
                  Container(
                    width: 2,
                    height: 30,
                    color: isCompleted ? Colors.green : Colors.grey,
                  ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: index < _steps.length - 1 ? 30 : 0),
                child: Text(
                  _labels[index],
                  style: TextStyle(
                    fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                    color: isCurrent ? Colors.black : Colors.grey,
                  ),
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
