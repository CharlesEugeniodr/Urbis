import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:urbis_citizen/main.dart';
import 'package:urbis_citizen/core/api_client.dart';
import 'package:urbis_citizen/core/auth_store.dart';

void main() {
  testWidgets('URBIS cidadão abre tela de autenticação', (tester) async {
    final api = ApiClient();
    final authStore = AuthStore(api);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider.value(value: api),
          ChangeNotifierProvider.value(value: authStore),
        ],
        child: const UrbisApp(),
      ),
    );

    expect(find.text('URBIS Cidadão'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
  });
}
