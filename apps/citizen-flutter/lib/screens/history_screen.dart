import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../widgets/occurrence_card.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _occurrences = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final res = await context.read<ApiClient>().get('/v1/me/occurrences');
      setState(() => _occurrences = res['records']);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_occurrences.isEmpty) return const Center(child: Text('Nenhuma ocorrência encontrada.'));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: _occurrences.length,
        itemBuilder: (context, index) {
          final occ = _occurrences[index];
          return OccurrenceCard(
            id: occ['id'],
            category: occ['categoryCode'],
            status: occ['status'] ?? 'REGISTERED',
            date: occ['createdAt'] ?? '',
            onTap: () => Navigator.pushNamed(context, '/occurrence-detail', arguments: occ['id']),
          );
        },
      ),
    );
  }
}
