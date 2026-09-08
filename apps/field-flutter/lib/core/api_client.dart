import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';

class ApiClient {
  static const String baseUrl = String.fromEnvironment('URBIS_API_URL', defaultValue: 'http://10.0.2.2:3100');
  final _storage = const FlutterSecureStorage();
  String? _token;

  Future<void> init() async {
    _token = await _storage.read(key: 'urbis_field_token');
  }

  Future<void> saveToken(String token) async {
    _token = token;
    await _storage.write(key: 'urbis_field_token', value: token);
  }

  Future<void> clearToken() async {
    _token = null;
    await _storage.delete(key: 'urbis_field_token');
  }

  bool get isAuthenticated => _token != null;

  Future<Map<String, dynamic>> call(String path, {String method = 'GET', Map<String, dynamic>? body}) async {
    final headers = {
      'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token'
    };

    final uri = Uri.parse('$baseUrl$path');
    http.Response r;

    if (method == 'POST') {
      r = await http.post(uri, headers: headers, body: jsonEncode(body ?? {}));
    } else {
      r = await http.get(uri, headers: headers);
    }

    final j = jsonDecode(r.body);
    if (r.statusCode >= 400) {
      throw Exception(j['error'] ?? r.statusCode.toString());
    }
    return Map<String, dynamic>.from(j);
  }
}
