import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/auth_store.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    final user = auth.user ?? {};

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil do Agente')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Icon(Icons.person_pin, size: 100, color: Colors.grey),
          const SizedBox(height: 16),
          Text(user['name'] ?? 'Agente', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
          Text(user['email'] ?? '', style: const TextStyle(color: Colors.grey), textAlign: TextAlign.center),
          const SizedBox(height: 32),
          const ListTile(
            leading: Icon(Icons.done_all),
            title: Text('Ordens Concluídas'),
            trailing: Text('0', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ),
          const Divider(),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () => auth.logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Sair'),
            style: ElevatedButton.styleFrom(foregroundColor: Colors.red),
          )
        ],
      ),
    );
  }
}
