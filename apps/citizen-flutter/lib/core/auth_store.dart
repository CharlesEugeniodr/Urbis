import 'package:flutter/material.dart';
import 'api_client.dart';

class AuthStore extends ChangeNotifier {
  final ApiClient api;
  Map<String, dynamic>? currentUser;
  bool isAuthenticated = false;
  bool isLoading = false;

  AuthStore(this.api);

  Future<void> checkAuth() async {
    await api.init();
    if (api.hasToken) {
      try {
        isLoading = true;
        notifyListeners();
        final res = await api.get('/v1/auth/me');
        currentUser = res['user'];
        isAuthenticated = true;
      } catch (e) {
        await logout();
      } finally {
        isLoading = false;
        notifyListeners();
      }
    }
  }

  Future<void> login(String email, String password) async {
    final res = await api.post('/v1/auth/login', {'email': email, 'password': password});
    await api.setToken(res['accessToken']);
    currentUser = res['user'];
    isAuthenticated = true;
    notifyListeners();
  }

  Future<void> register(String email, String password, String displayName, [String? cpf]) async {
    final body = {'email': email, 'password': password, 'displayName': displayName};
    if (cpf != null && cpf.isNotEmpty) body['cpf'] = cpf;
    final res = await api.post('/v1/auth/register', body);
    await api.setToken(res['accessToken']);
    currentUser = res['user'];
    isAuthenticated = true;
    notifyListeners();
  }

  Future<void> logout() async {
    await api.setToken(null);
    currentUser = null;
    isAuthenticated = false;
    notifyListeners();
  }
}
