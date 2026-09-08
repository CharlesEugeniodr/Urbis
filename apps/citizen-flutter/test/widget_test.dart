import 'package:flutter_test/flutter_test.dart';
import 'package:urbis_citizen/main.dart';

void main() {
  testWidgets('URBIS Cidadão smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const UrbisApp());
    expect(find.text('URBIS'), findsWidgets);
  });
}
