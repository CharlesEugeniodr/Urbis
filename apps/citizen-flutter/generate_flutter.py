import os

base_dir = r"C:\Users\charl\.gemini\antigravity\scratch\Urbis-repo\apps\citizen-flutter\lib"
os.makedirs(os.path.join(base_dir, "screens"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "widgets"), exist_ok=True)

files = {}

files["main.dart"] = """import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_client.dart';
import 'core/auth_store.dart';
import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/new_occurrence_screen.dart';
import 'screens/occurrence_detail_screen.dart';
import 'screens/notifications_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  final authStore = AuthStore(api);
  await authStore.checkAuth();
  runApp(
    MultiProvider(
      providers: [
        Provider.value(value: api),
        ChangeNotifierProvider.value(value: authStore),
      ],
      child: const UrbisApp(),
    ),
  );
}

class UrbisApp extends StatelessWidget {
  const UrbisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'URBIS Cidadão',
      theme: AppTheme.lightTheme,
      home: Consumer<AuthStore>(
        builder: (context, auth, _) {
          if (auth.isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
          return auth.isAuthenticated ? const HomeScreen() : const LoginScreen();
        },
      ),
      routes: {
        '/login': (_) => const LoginScreen(),
        '/register': (_) => const RegisterScreen(),
        '/home': (_) => const HomeScreen(),
        '/new-occurrence': (_) => const NewOccurrenceScreen(),
        '/notifications': (_) => const NotificationsScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/occurrence-detail') {
          final id = settings.arguments as String;
          return MaterialPageRoute(builder: (_) => OccurrenceDetailScreen(occurrenceId: id));
        }
        return null;
      },
    );
  }
}
"""

files["screens/login_screen.dart"] = """import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/auth_store.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    setState(() => _isLoading = true);
    try {
      await context.read<AuthStore>().login(_email.text, _password.text);
      if (mounted) Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.location_city, size: 80, color: Color(0xFF07507C)),
            const SizedBox(height: 16),
            const Text('URBIS Cidadão', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 32),
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'E-mail')),
            const SizedBox(height: 16),
            TextField(controller: _password, decoration: const InputDecoration(labelText: 'Senha'), obscureText: true),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isLoading ? null : _login,
                child: _isLoading ? const CircularProgressIndicator() : const Text('Entrar'),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/register'),
              child: const Text('Não tem conta? Cadastre-se'),
            ),
          ],
        ),
      ),
    );
  }
}
"""

files["screens/register_screen.dart"] = """import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/auth_store.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _cpf = TextEditingController();
  final _password = TextEditingController();
  bool _isLoading = false;

  Future<void> _register() async {
    setState(() => _isLoading = true);
    try {
      await context.read<AuthStore>().register(_email.text, _password.text, _name.text, _cpf.text);
      if (mounted) Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cadastro')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nome Completo')),
            const SizedBox(height: 16),
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'E-mail')),
            const SizedBox(height: 16),
            TextField(controller: _cpf, decoration: const InputDecoration(labelText: 'CPF (Opcional)')),
            const SizedBox(height: 16),
            TextField(controller: _password, decoration: const InputDecoration(labelText: 'Senha'), obscureText: true),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isLoading ? null : _register,
                child: _isLoading ? const CircularProgressIndicator() : const Text('Cadastrar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
"""

files["screens/home_screen.dart"] = """import 'package:flutter/material.dart';
import 'history_screen.dart';
import 'ranking_screen.dart';
import 'profile_screen.dart';
import 'new_occurrence_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _screens = [
    const NewOccurrenceScreen(),
    const HistoryScreen(),
    const RankingScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('URBIS'),
        actions: [
          IconButton(
            icon: const Badge(child: Icon(Icons.notifications)),
            onPressed: () => Navigator.pushNamed(context, '/notifications'),
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.add_circle), label: 'Nova'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Histórico'),
          BottomNavigationBarItem(icon: Icon(Icons.emoji_events), label: 'Ranking'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Perfil'),
        ],
      ),
    );
  }
}
"""

files["screens/new_occurrence_screen.dart"] = """import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../widgets/category_selector.dart';

class NewOccurrenceScreen extends StatefulWidget {
  const NewOccurrenceScreen({super.key});

  @override
  State<NewOccurrenceScreen> createState() => _NewOccurrenceScreenState();
}

class _NewOccurrenceScreenState extends State<NewOccurrenceScreen> {
  String? _selectedCategory;
  final _desc = TextEditingController();
  bool _isLoading = false;

  Future<void> _submit() async {
    if (_selectedCategory == null || _desc.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Preencha todos os campos')));
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await context.read<ApiClient>().post('/v1/occurrences', {
        'categoryCode': _selectedCategory,
        'description': _desc.text,
        'latitude': -23.5505,
        'longitude': -46.6333,
        'gpsAccuracyM': 10.0,
      });
      if (mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Sucesso'),
            content: Text('Protocolo: \${res['occurrence']['id']}'),
            actions: [
              TextButton(onPressed: () {
                Navigator.pop(context);
                setState(() { _selectedCategory = null; _desc.clear(); });
              }, child: const Text('OK'))
            ]
          )
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Selecione a Categoria', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          CategorySelector(
            selected: _selectedCategory,
            onSelect: (c) => setState(() => _selectedCategory = c),
          ),
          const SizedBox(height: 16),
          TextField(controller: _desc, decoration: const InputDecoration(labelText: 'Descrição'), maxLines: 3),
          const SizedBox(height: 16),
          // Fake Map for now
          Container(height: 150, color: Colors.grey[300], child: const Center(child: Text('Mapa / GPS'))),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _isLoading ? null : _submit,
              icon: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Icon(Icons.send),
              label: const Text('Registrar Ocorrência'),
            ),
          ),
        ],
      ),
    );
  }
}
"""

files["screens/history_screen.dart"] = """import 'package:flutter/material.dart';
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
"""

files["screens/occurrence_detail_screen.dart"] = """import 'package:flutter/material.dart';
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
      final res = await context.read<ApiClient>().get('/v1/occurrences/\${widget.occurrenceId}');
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
      appBar: AppBar(title: Text('Detalhe - \${_occurrence!['id']}')),
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
            Text('Descrição: \${_occurrence!['description']}'),
            const SizedBox(height: 16),
            Text('Status: \${_occurrence!['status']}'),
            const SizedBox(height: 16),
            Container(height: 200, color: Colors.grey[200], child: const Center(child: Text('Mapa Ocorrência'))),
          ],
        ),
      ),
    );
  }
}
"""

files["screens/ranking_screen.dart"] = """import 'package:flutter/material.dart';
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
          leading: index < 3 ? Icon(Icons.emoji_events, color: index == 0 ? Colors.amber : index == 1 ? Colors.grey : Colors.brown) : Text('#\${r['position']}'),
          title: Text(r['displayName']),
          trailing: Text('\${r['totalPoints']} pts', style: const TextStyle(fontWeight: FontWeight.bold)),
        );
      },
    );
  }
}
"""

files["screens/profile_screen.dart"] = """import 'package:flutter/material.dart';
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
"""

files["screens/notifications_screen.dart"] = """import 'package:flutter/material.dart';
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
"""

files["widgets/occurrence_card.dart"] = """import 'package:flutter/material.dart';
import '../core/theme.dart';
import 'status_badge.dart';

class OccurrenceCard extends StatelessWidget {
  final String id;
  final String category;
  final String status;
  final String date;
  final VoidCallback onTap;

  const OccurrenceCard({super.key, required this.id, required this.category, required this.status, required this.date, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.getCategoryColor(category).withOpacity(0.2),
          child: Icon(AppTheme.getCategoryIcon(category), color: AppTheme.getCategoryColor(category)),
        ),
        title: Text('Protocolo: \$id'),
        subtitle: Text(date),
        trailing: StatusBadge(status: status),
        onTap: onTap,
      ),
    );
  }
}
"""

files["widgets/status_badge.dart"] = """import 'package:flutter/material.dart';

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
"""

files["widgets/category_selector.dart"] = """import 'package:flutter/material.dart';
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
"""

files["widgets/map_view.dart"] = """import 'package:flutter/material.dart';

// Stub Map view as the dependencies request failed initially.
// We will simply display a placeholder map box.
class MapView extends StatelessWidget {
  const MapView({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.grey[200],
      child: const Center(child: Text('Map View Placeholder')),
    );
  }
}
"""

for file_path, content in files.items():
    with open(os.path.join(base_dir, file_path), 'w', encoding='utf-8') as f:
        f.write(content)
print("Files generated successfully.")
