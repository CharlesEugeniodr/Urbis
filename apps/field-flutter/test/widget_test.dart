import 'package:flutter_test/flutter_test.dart';
import 'package:urbis_field/main.dart';

void main() {
  testWidgets('URBIS Campo smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const UrbisFieldApp());
    expect(find.text('URBIS'), findsWidgets);
  });
}
