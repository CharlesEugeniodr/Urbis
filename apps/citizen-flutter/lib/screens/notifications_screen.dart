import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await context.read<ApiClient>().get('/v1/me/notifications');
      setState(() => _notifs = res['records']);
    } catch (e) {
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notificações')),
      body: _isLoading ? const Center(child: CircularProgressIndicator()) : ListView.builder(
        itemCount: _notifs.length,
        itemBuilder: (context, index) {
          final n = _notifs[index];
          return ListTile(
            leading: const Icon(Icons.notifications),
            title: Text(n['title'] ?? 'Sem título'),
            subtitle: Text(n['body'] ?? ''),
          );
        },
      ),
    );
  }
}
