import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';

class RankingScreen extends StatefulWidget {
  const RankingScreen({super.key});

  @override
  State<RankingScreen> createState() => _RankingScreenState();
}

class _RankingScreenState extends State<RankingScreen> {
  List<dynamic> _rankings = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await context.read<ApiClient>().get('/v1/rankings/current');
      setState(() => _rankings = res['rankings']);
    } catch (e) {
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return ListView.builder(
      itemCount: _rankings.length,
      itemBuilder: (context, index) {
        final r = _rankings[index];
        return ListTile(
          leading: index < 3 ? Icon(Icons.emoji_events, color: index == 0 ? Colors.amber : index == 1 ? Colors.grey : Colors.brown) : Text('#${r['position']}'),
          title: Text(r['displayName']),
          trailing: Text('${r['totalPoints']} pts', style: const TextStyle(fontWeight: FontWeight.bold)),
        );
      },
    );
  }
}
