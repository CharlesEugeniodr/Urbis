import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_client.dart';
import 'core/auth_store.dart';
import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const UrbisFieldApp());
}

class UrbisFieldApp extends StatelessWidget {
  const UrbisFieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>(create: (_) => ApiClient()),
        ChangeNotifierProxyProvider<ApiClient, AuthStore>(
          create: (ctx) => AuthStore(ctx.read<ApiClient>()),
          update: (_, api, auth) => auth ?? AuthStore(api),
        ),
      ],
      child: MaterialApp(
        title: 'URBIS Campo',
        theme: AppTheme.theme,
        home: Consumer<AuthStore>(
          builder: (context, auth, _) {
            if (auth.isLoading) {
              return const Scaffold(body: Center(child: CircularProgressIndicator()));
            }
            return auth.user != null ? const HomeScreen() : const LoginScreen();
          },
        ),
      ),
    );
  }
}
