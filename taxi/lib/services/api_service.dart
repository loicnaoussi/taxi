import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = "http://192.168.1.158:5000"; // Remplace avec ton IP locale
  final Dio _dio = Dio();

  /// ✅ **Connexion (Login)**
  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      Response response = await _dio.post(
        "$baseUrl/api/auth/login",
        data: {"email": email, "password": password},
      );

      if (response.statusCode == 200) {
        final token = response.data["accessToken"];
        final userType = response.data["user"]["user_type"];

        // 🔥 Sauvegarder le token dans SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        await prefs.setString('user_type', userType);

        return response.data;
      }
    } catch (e) {
      print("❌ Erreur lors de la connexion : $e");
    }
    return null;
  }

  /// ✅ **Inscription (Signup)**
  Future<bool> signUp(String name, String email, String phone, String password, String role) async {
    try {
      Response response = await _dio.post(
        "$baseUrl/api/auth/register",
        data: {
          "username": name,
          "email": email,
          "phone_number": phone,
          "password": password,
          "user_type": role
        },
      );

      return response.statusCode == 201;
    } catch (e) {
      print("❌ Erreur lors de l'inscription : $e");
      return false;
    }
  }
}
