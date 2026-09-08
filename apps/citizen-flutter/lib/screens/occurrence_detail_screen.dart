import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/theme.dart';

class OccurrenceDetailScreen extends StatefulWidget {
  final String occurrenceId;
  const OccurrenceDetailScreen({super.key, required this.occurrenceId});

  @override
  State<OccurrenceDetailScreen> createState() => _OccurrenceDetailScreenState();
}

class _OccurrenceDetailScreenState extends State<OccurrenceDetailScreen> {
  Map<String, dynamic>? _occurrence;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await context.read<ApiClient>().get('/v1/occurrences/${widget.occurrenceId}');
      setState(() => _occurrence = res['occurrence']);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_occurrence == null) return const Scaffold(body: Center(child: Text('Erro ao carregar')));

    return Scaffold(
      appBar: AppBar(title: Text('Detalhe - ${_occurrence!['id']}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(AppTheme.getCategoryIcon(_occurrence!['categoryCode']), color: AppTheme.getCategoryColor(_occurrence!['categoryCode'])),
                const SizedBox(width: 8),
                Text(_occurrence!['categoryCode'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 16),
            Text('DescriÃ§Ã£o: ${_occurrence!['description']}'),
            const SizedBox(height: 16),
            Text('Status: ${_occurrence!['status']}'),
            const SizedBox(height: 16),
            Container(height: 200, color: Colors.grey[200], child: const Center(child: Text('Mapa OcorrÃªncia (Placeholder)'))),
          ],
        ),
      ),
    );
  }
}
