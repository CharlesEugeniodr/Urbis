import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/auth_store.dart';
import '../core/api_client.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthStore>().currentUser;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        CircleAvatar(radius: 40, child: Text(user?['displayName']?.substring(0, 1).toUpperCase() ?? 'U', style: const TextStyle(fontSize: 24))),
        const SizedBox(height: 16),
        Text(user?['displayName'] ?? '', textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(user?['email'] ?? '', textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
        const Divider(height: 32),
        ListTile(
          leading: const Icon(Icons.download),
          title: const Text('Exportar meus dados (LGPD)'),
          onTap: () async {
            await context.read<ApiClient>().post('/v1/me/privacy-requests', {'type': 'DATA_EXPORT'});
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Solicitação enviada')));
          },
        ),
        ListTile(
          leading: const Icon(Icons.delete_forever, color: Colors.red),
          title: const Text('Excluir conta (LGPD)', style: TextStyle(color: Colors.red)),
          onTap: () async {
            await context.read<ApiClient>().post('/v1/me/privacy-requests', {'type': 'DATA_DELETION'});
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Solicitação enviada')));
          },
        ),
        const Divider(height: 32),
        ListTile(
          leading: const Icon(Icons.logout),
          title: const Text('Sair'),
          onTap: () {
            context.read<AuthStore>().logout();
            Navigator.pushReplacementNamed(context, '/login');
          },
        ),
      ],
    );
  }
}
