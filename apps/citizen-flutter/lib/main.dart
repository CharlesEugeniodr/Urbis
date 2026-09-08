import 'package:flutter/material.dart';
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
