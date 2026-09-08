import 'package:flutter/material.dart';
import '../core/theme.dart';

class CategorySelector extends StatelessWidget {
  final String? selected;
  final ValueChanged<String> onSelect;

  const CategorySelector({super.key, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    const cats = ['LIGHTING', 'TRAFFIC_SIGNAL', 'WATER', 'ENERGY', 'PAVEMENT', 'RESILIENCE'];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: cats.map((c) => ChoiceChip(
        label: Text(c),
        selected: selected == c,
        onSelected: (val) { if (val) onSelect(c); },
        avatar: Icon(AppTheme.getCategoryIcon(c), color: selected == c ? Colors.white : AppTheme.getCategoryColor(c)),
        selectedColor: AppTheme.getCategoryColor(c),
        labelStyle: TextStyle(color: selected == c ? Colors.white : Colors.black),
      )).toList(),
    );
  }
}
