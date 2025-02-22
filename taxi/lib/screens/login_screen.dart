import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/config.dart';
import 'package:taxi/routes/routes.dart';
import 'package:taxi/themes/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController identifierController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool isLoading = false;
  bool isPasswordVisible = false;

  String? identifierError;
  String? passwordError;

  final Dio _dio = Dio();

  /// Basic validation for the identifier field (email or phone)
  bool validateIdentifier(String ident) => ident.trim().isNotEmpty;

  /// Basic validation for the password (at least 6 characters)
  bool validatePassword(String pwd) => pwd.length >= 6;

  /// Login API call
  Future<void> _login() async {
    // Client-side validations
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
      // Call the login endpoint using the baseUrl from config.dart
      final Response response = await _dio.post(
        "${Config.baseUrl}/api/auth/login",
        data: {
          "identifier": identifierController.text.trim(),
          "password": passwordController.text,
        },
      );

      if (response.statusCode == 200) {
        // Expecting response: { "accessToken": "...", "user": { "user_type": "...", ... } }
        final data = response.data;
        final String token = data["accessToken"] ?? "";
        final String userType = data["user"]?["user_type"] ?? "passenger";

        // Store token and user type locally
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        await prefs.setString('user_type', userType);

        // Navigate based on user type
        if (userType == "driver") {
          Navigator.pushReplacementNamed(context, Routes.driverHome);
        } else {
          Navigator.pushReplacementNamed(context, Routes.passengerHome);
        }
      } else {
        // If the API returns an error (e.g., 401), show a dialog prompting re-entry.
        _showRetryDialog(response.data["message"] ?? "Identifiant ou mot de passe incorrect. Veuillez réessayer.");
      }
    } on DioError catch (e) {
      String errorMsg;
      if (e.response?.data is Map) {
        errorMsg = "Login failed: ${e.response?.data["message"] ?? e.toString()}";
      } else {
        errorMsg = "Login failed: ${e.response?.data ?? e.toString()}";
      }
      _showRetryDialog(errorMsg);
    } catch (e) {
      _showRetryDialog("Login failed: ${e.toString()}");
    } finally {
      setState(() => isLoading = false);
    }
  }

  /// Displays a dialog with a custom error message and a button to let the user try again.
  Future<void> _showRetryDialog(String message) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          "Erreur d'authentification",
          style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
        ),
        content: Text(
          message,
          style: const TextStyle(fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Réessayer", style: TextStyle(fontSize: 16)),
          ),
        ],
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      ),
    );
  }

  /// Build a generic text field widget
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

  /// Build password field with toggle for visibility
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        // Light gradient background
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
                // Icon and title
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
                // Email or phone field
                _buildTextField(
                  controller: identifierController,
                  hintText: "Email or Phone",
                  icon: Icons.person_outline,
                  errorText: identifierError,
                ),
                const SizedBox(height: 15),
                // Password field
                _buildPasswordField(),
                const SizedBox(height: 20),
                // Login button
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
                // Link to Sign Up screen
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                    GestureDetector(
                      onTap: () {
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
}
