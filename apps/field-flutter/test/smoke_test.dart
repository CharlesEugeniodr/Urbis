import 'package:flutter_test/flutter_test.dart';
import 'package:urbis_field/main.dart';
void main(){testWidgets('URBIS campo abre tela de autenticação',(tester)async{await tester.pumpWidget(const UrbisFieldApp());expect(find.text('URBIS Campo'),findsOneWidget);expect(find.text('Entrar'),findsOneWidget);});}
