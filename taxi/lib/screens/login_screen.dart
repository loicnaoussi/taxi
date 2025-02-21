import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/routes/routes.dart';
import 'package:taxi/themes/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController identifierController = TextEditingController();
  final TextEditingController passwordController   = TextEditingController();

  bool isLoading         = false;
  bool isPasswordVisible = false;

  String? identifierError;
  String? passwordError;

  final Dio _dio = Dio();

  /// Validation de base pour l'identifiant
  bool validateIdentifier(String ident) => ident.trim().isNotEmpty;

  /// Validation de base pour le mot de passe (6 caractères minimum)
  bool validatePassword(String pwd) => pwd.length >= 6;

  /// Appel API pour la connexion
  Future<void> _login() async {
    // Vérifications élémentaires côté client
    setState(() {
      identifierError = validateIdentifier(identifierController.text)
          ? null
          : "Please enter an email or phone";
      passwordError = validatePassword(passwordController.text)
          ? null
          : "Password must be at least 6 characters";
    });

    if (identifierError != null || passwordError != null) return;

    setState(() => isLoading = true);

    try {
      // Appel à l'API de login
      final Response response = await _dio.post(
        "http://192.168.1.158:5000/api/auth/login", // <-- Remplacez par votre URL de login
        data: {
          "identifier": identifierController.text.trim(),
          "password": passwordController.text,
        },
      );

      if (response.statusCode == 200) {
        // Dans votre backend, vous renvoyez par ex. { "accessToken": "...", "user": {...} }
        final data      = response.data;
        final String token    = data["accessToken"] ?? "";
        final userType        = data["user"]?["user_type"] ?? "passenger";

        // Stockage local avec SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        await prefs.setString('user_type', userType);

        // Redirection : si driver => DriverHome, sinon => PassengerHome
        if (userType == "driver") {
          Navigator.pushReplacementNamed(context, Routes.driverHome);
        } else {
          Navigator.pushReplacementNamed(context, Routes.passengerHome);
        }
      } else {
        // Message d’erreur renvoyé par l’API
        final String msg = response.data["message"] ?? "Login failed.";
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (e) {
      // Erreur réseau ou autre
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Login failed: ${e.toString()}")),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }

  /// Construction de l'interface
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        // Dégradé en fond, comme dans votre SignUpScreen
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppTheme.primaryColor.withOpacity(0.1), Colors.white],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 40),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Icône/Login
                Icon(Icons.login_rounded, size: 90, color: AppTheme.primaryColor),
                const SizedBox(height: 20),

                const Text(
                  "Log In",
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  "Access your account",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 30),

                // Champ Email ou Téléphone
                _buildTextField(
                  controller: identifierController,
                  hintText: "Email or Phone",
                  icon: Icons.person_outline,
                  errorText: identifierError,
                ),
                const SizedBox(height: 15),

                // Champ Password
                _buildPasswordField(),
                const SizedBox(height: 20),

                // Bouton de connexion
                ElevatedButton(
                  onPressed: isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: AppTheme.primaryColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    minimumSize: const Size(double.infinity, 50),
                  ),
                  child: isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          "Log In",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
                const SizedBox(height: 20),

                // Lien "Sign Up" si pas de compte
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                    GestureDetector(
                      onTap: () {
                        // Vous pouvez renvoyer vers votre page d'inscription
                        Navigator.pushReplacementNamed(context, Routes.signUpScreen);
                      },
                      child: const Text(
                        "Sign Up",
                        style: TextStyle(
                          color: Colors.blue,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// TextField générique
  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    String? errorText,
  }) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        prefixIcon: Icon(icon, color: AppTheme.primaryColor),
        hintText: hintText,
        errorText: errorText,
        filled: true,
        fillColor: Colors.grey.shade200,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(30),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  /// Champ mot de passe avec bouton de visibilité
  Widget _buildPasswordField() {
    return TextField(
      controller: passwordController,
      obscureText: !isPasswordVisible,
      decoration: InputDecoration(
        prefixIcon: Icon(Icons.lock_outline, color: AppTheme.primaryColor),
        suffixIcon: IconButton(
          icon: Icon(
            isPasswordVisible ? Icons.visibility : Icons.visibility_off,
            color: AppTheme.primaryColor,
          ),
          onPressed: () => setState(() => isPasswordVisible = !isPasswordVisible),
        ),
        hintText: "Password",
        errorText: passwordError,
        filled: true,
        fillColor: Colors.grey.shade200,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(30),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}
