import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String baseUrl = String.fromEnvironment('URBIS_API_URL', defaultValue: 'http://10.0.2.2:3100');
  final _storage = const FlutterSecureStorage();
  String? _token;

  Future<void> init() async {
    _token = await _storage.read(key: 'access_token');
  }

  bool get hasToken => _token != null;

  Future<void> setToken(String? token) async {
    _token = token;
    if (token != null) {
      await _storage.write(key: 'access_token', value: token);
    } else {
      await _storage.delete(key: 'access_token');
    }
  }

  Map<String, String> get _headers {
    final headers = {'Content-Type': 'application/json'};
    if (_token != null) headers['Authorization'] = 'Bearer $_token';
    return headers;
  }

  void _handleError(http.Response res) {
    if (res.statusCode >= 400) {
      if (res.statusCode == 401) {
        setToken(null);
        throw Exception('Não autorizado. Faça login novamente.');
      }
      String message = 'Erro desconhecido';
      try {
        final body = jsonDecode(res.body);
        message = body['message'] ?? message;
      } catch (_) {}
      throw Exception(message);
    }
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse('$baseUrl$path'), headers: _headers, body: jsonEncode(body));
    _handleError(res);
    if (res.body.isEmpty) return {};
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> get(String path) async {
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: _headers);
    _handleError(res);
    return jsonDecode(res.body);
  }
}
