import 'package:flutter/material.dart';
import 'api_client.dart';

class AuthStore extends ChangeNotifier {
  final ApiClient apiClient;
  Map<String, dynamic>? user;
  bool isLoading = true;

  AuthStore(this.apiClient) {
    _init();
  }

  Future<void> _init() async {
    await apiClient.init();
    if (apiClient.isAuthenticated) {
      try {
        final res = await apiClient.call('/v1/auth/me');
        user = res['user'];
      } catch (e) {
        await apiClient.clearToken();
      }
    }
    isLoading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final res = await apiClient.call('/v1/auth/login', method: 'POST', body: {
      'email': email,
      'password': password,
    });
    await apiClient.saveToken(res['accessToken']);
    user = res['user'];
    notifyListeners();
  }

  Future<void> logout() async {
    await apiClient.clearToken();
    user = null;
    notifyListeners();
  }
}
