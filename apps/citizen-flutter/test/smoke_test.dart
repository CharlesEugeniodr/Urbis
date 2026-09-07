import 'package:flutter_test/flutter_test.dart';
import 'package:urbis_citizen/main.dart';
void main(){testWidgets('URBIS cidadão abre tela de autenticação',(tester)async{await tester.pumpWidget(const UrbisApp());expect(find.text('URBIS — Cidadão'),findsOneWidget);expect(find.text('Entrar'),findsOneWidget);});}
