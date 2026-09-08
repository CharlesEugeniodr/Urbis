import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:urbis_field/main.dart';

void main() {
  testWidgets('Smoke test app build', (WidgetTester tester) async {
    await tester.pumpWidget(const UrbisFieldApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
