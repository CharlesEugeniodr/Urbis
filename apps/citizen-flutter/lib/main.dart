import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

void main() => runApp(const UrbisApp());

class UrbisApp extends StatelessWidget {
  const UrbisApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'URBIS',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(colorSchemeSeed: const Color(0xFF07507C), useMaterial3: true),
    home: const CitizenHome(),
  );
}

class UrbisApi {
  UrbisApi(this.baseUrl);
  final String baseUrl;
  final _storage = const FlutterSecureStorage();
  Future<String?> token() => _storage.read(key: 'urbis_access_token');
  Future<Map<String,dynamic>> _json(String path,{String method='GET',Map<String,dynamic>? body,bool auth=true}) async {
    final headers=<String,String>{'content-type':'application/json'};
    if(auth){final t=await token();if(t!=null)headers['authorization']='Bearer $t';}
    final uri=Uri.parse('$baseUrl$path');
    final response=method=='POST'
      ? await http.post(uri,headers:headers,body:jsonEncode(body??{}))
      : await http.get(uri,headers:headers);
    final data=jsonDecode(response.body) as Map<String,dynamic>;
    if(response.statusCode<200||response.statusCode>=300)throw Exception(data['error']??'HTTP ${response.statusCode}');
    return data;
  }
  Future<Map<String,dynamic>> login(String email,String password) async {
    final data=await _json('/v1/auth/login',method:'POST',auth:false,body:{'email':email,'password':password});
    await _storage.write(key:'urbis_access_token',value:data['accessToken'] as String);
    return data;
  }
  Future<Map<String,dynamic>> createOccurrence({required String category,required String description,required Position position}) =>
    _json('/v1/occurrences',method:'POST',body:{
      'categoryCode':category,'description':description,'latitude':position.latitude,'longitude':position.longitude,
      'gpsAccuracyM':position.accuracy,'clientRequestId':DateTime.now().microsecondsSinceEpoch.toString()
    });
  Future<Map<String,dynamic>> uploadEvidence(String occurrenceId,XFile file,Position position) async {
    final Uint8List bytes=await file.readAsBytes();
    return _json('/v1/occurrences/$occurrenceId/evidence',method:'POST',body:{
      'filename':file.name,'mediaType':file.mimeType??'image/jpeg','dataBase64':base64Encode(bytes),
      'capturedAt':DateTime.now().toUtc().toIso8601String(),'latitude':position.latitude,'longitude':position.longitude
    });
  }
  Future<Map<String,dynamic>> registerDevice(String pushToken,String platform) =>
    _json('/v1/me/devices',method:'POST',body:{'token':pushToken,'platform':platform});
}

class CitizenHome extends StatefulWidget { const CitizenHome({super.key}); @override State<CitizenHome> createState()=>_CitizenHomeState(); }
class _CitizenHomeState extends State<CitizenHome> {
  final api=UrbisApi(const String.fromEnvironment('URBIS_API_URL',defaultValue:'http://10.0.2.2:3100'));
  final email=TextEditingController(text:'citizen@urbis.local');
  final password=TextEditingController();
  final description=TextEditingController();
  String category='PAVEMENT',message=''; bool authenticated=false,busy=false; Position? position; XFile? evidence;

  Future<void> run(Future<void> Function() fn) async {setState(()=>busy=true);try{await fn();}catch(e){setState(()=>message=e.toString());}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> signIn()=>run(()async{final r=await api.login(email.text,password.text);setState(()=>authenticated=true,message='Conectado como ${r['user']['displayName']}');await setupPush();});
  Future<void> setupPush() async {
    try{
      await Firebase.initializeApp();
      await FirebaseMessaging.instance.requestPermission(alert:true,badge:true,sound:true);
      final t=await FirebaseMessaging.instance.getToken();
      if(t!=null&&t.isNotEmpty){
        final platform=kIsWeb?'WEB':defaultTargetPlatform==TargetPlatform.iOS?'IOS':'ANDROID';
        await api.registerDevice(t,platform);
      }
      FirebaseMessaging.onMessage.listen((m){if(mounted)setState(()=>message=m.notification?.title??'Nova notificação URBIS');});
    }catch(_){
      // Firebase depende da configuração nativa do projeto. O app continua funcional sem push em desenvolvimento.
    }
  }
  Future<void> locate()=>run(()async{
    var permission=await Geolocator.checkPermission();
    if(permission==LocationPermission.denied)permission=await Geolocator.requestPermission();
    if(permission==LocationPermission.denied||permission==LocationPermission.deniedForever)throw Exception('Permissão de localização negada');
    final p=await Geolocator.getCurrentPosition(desiredAccuracy:LocationAccuracy.high);setState(()=>position=p,message='GPS: ${p.latitude.toStringAsFixed(6)}, ${p.longitude.toStringAsFixed(6)} • ±${p.accuracy.toStringAsFixed(0)} m');
  });
  Future<void> pick()=>run(()async{final x=await ImagePicker().pickImage(source:ImageSource.camera,imageQuality:90);if(x!=null)setState(()=>evidence=x,message='Evidência capturada: ${x.name}');});
  Future<void> submit()=>run(()async{
    final p=position;if(p==null)throw Exception('Capture o GPS antes do envio.');
    final created=await api.createOccurrence(category:category,description:description.text,position:p);
    final occ=created['occurrence'] as Map<String,dynamic>;Map<String,dynamic>? ev;
    if(evidence!=null)ev=await api.uploadEvidence(occ['id'] as String,evidence!,p);
    final ici=ev?['evidence']?['ici'];setState(()=>message='Protocolo ${occ['protocol']}${ici!=null?' • ICI ${ici['score']}/100':''}');
  });
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:const Text('URBIS — Cidadão')),
    body:ListView(padding:const EdgeInsets.all(18),children:[
      if(!authenticated)...[
        TextField(controller:email,decoration:const InputDecoration(labelText:'E-mail')),
        TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Senha')),
        const SizedBox(height:12),FilledButton(onPressed:busy?null:signIn,child:const Text('Entrar')),
      ] else ...[
        DropdownButtonFormField<String>(value:category,decoration:const InputDecoration(labelText:'Categoria'),items:const [
          DropdownMenuItem(value:'LIGHTING',child:Text('Iluminação pública')),DropdownMenuItem(value:'TRAFFIC_SIGNAL',child:Text('Semáforo / sinalização')),
          DropdownMenuItem(value:'WATER',child:Text('Água / abastecimento')),DropdownMenuItem(value:'ENERGY',child:Text('Energia elétrica')),
          DropdownMenuItem(value:'PAVEMENT',child:Text('Buraco / pavimentação')),DropdownMenuItem(value:'RESILIENCE',child:Text('Resiliência / risco'))
        ],onChanged:(v)=>setState(()=>category=v??category)),
        TextField(controller:description,maxLines:4,decoration:const InputDecoration(labelText:'Descrição')),
        const SizedBox(height:12),OutlinedButton.icon(onPressed:busy?null:locate,icon:const Icon(Icons.my_location),label:const Text('Capturar GPS')),
        OutlinedButton.icon(onPressed:busy?null:pick,icon:const Icon(Icons.camera_alt_outlined),label:const Text('Fotografar evidência')),
        FilledButton.icon(onPressed:busy?null:submit,icon:const Icon(Icons.send),label:const Text('Registrar ocorrência')),
      ],
      if(busy)const Padding(padding:EdgeInsets.all(14),child:LinearProgressIndicator()),
      if(message.isNotEmpty)Padding(padding:const EdgeInsets.only(top:14),child:Text(message)),
      const Padding(padding:EdgeInsets.only(top:24),child:Text('ICI-URBIS é indicador interno de confiança de engenharia; não comprova automaticamente veracidade ou autenticidade.',style:TextStyle(fontSize:11,color:Colors.black54))),
    ])
  );
}
