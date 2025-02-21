import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/routes/routes.dart';
import 'package:taxi/themes/theme.dart';
import 'package:taxi/config.dart'; // Import du fichier de configuration

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  // --- Contrôleurs de texte ---
  final TextEditingController usernameController  = TextEditingController();
  final TextEditingController fullNameController  = TextEditingController();
  final TextEditingController emailController     = TextEditingController();
  final TextEditingController phoneController     = TextEditingController();
  final TextEditingController passwordController  = TextEditingController();
  
  // État de l'interface
  bool isLoading         = false;
  bool isPasswordVisible = false;
  String selectedRole    = "passenger"; // Rôle par défaut (peut être "driver")

  // Erreurs éventuelles
  String? usernameError;
  String? emailError;
  String? passwordError;

  final Dio _dio = Dio();

  // --- Validations de base ---
  bool validateUsername(String username) => username.trim().isNotEmpty;

  bool validateEmail(String email) {
    final RegExp emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    return emailRegex.hasMatch(email);
  }

  bool validatePassword(String password) => password.length >= 6;

  // --- Fonction principale d'inscription ---
  Future<void> _signUp() async {
    // Validations côté client
    setState(() {
      usernameError = validateUsername(usernameController.text)
          ? null
          : "Le nom d'utilisateur est requis";
      emailError = validateEmail(emailController.text)
          ? null
          : "Email invalide";
      passwordError = validatePassword(passwordController.text)
          ? null
          : "Le mot de passe doit contenir au moins 6 caractères";
    });

    // Si l'une des validations échoue, on arrête
    if (usernameError != null || emailError != null || passwordError != null) {
      return;
    }

    setState(() => isLoading = true);

    try {
      // Appel à l'API /api/auth/register
      final Response response = await _dio.post(
        "${Config.baseUrl}/api/auth/register",
        data: {
          "username":     usernameController.text.trim(),
          "full_name":    fullNameController.text.trim(),
          "email":        emailController.text.trim(),
          "phone_number": phoneController.text.trim(),
          "password":     passwordController.text,
          "user_type":    selectedRole,
        },
      );

      if (response.statusCode == 201) {
        // Stockage du rôle dans SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_type', selectedRole);

        // Redirection selon le rôle
        Navigator.pushReplacementNamed(
          context,
          selectedRole == "driver" ? Routes.driverHome : Routes.passengerHome,
        );
      } else {
        // Erreur renvoyée par le backend
        final String message = response.data["message"] ?? "Une erreur s'est produite.";
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      }
    } catch (e) {
      // Erreur réseau ou autre
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("L'inscription a échoué: ${e.toString()}")),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }

  // --- Construction de l'interface ---
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        // Fond dégradé léger
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
                Icon(Icons.local_taxi_rounded,
                    size: 90, color: AppTheme.primaryColor),
                const SizedBox(height: 20),
                const Text(
                  "Sign Up",
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  "Create your account to get started",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 30),
                // Champ "Username" (requis)
                _buildTextField(
                  controller: usernameController,
                  hintText: "Username",
                  icon: Icons.person_outline,
                  errorText: usernameError,
                ),
                const SizedBox(height: 15),
                // Champ "Full Name"
                _buildTextField(
                  controller: fullNameController,
                  hintText: "Full Name",
                  icon: Icons.person,
                ),
                const SizedBox(height: 15),
                // Champ "Email"
                _buildTextField(
                  controller: emailController,
                  hintText: "Email Address",
                  icon: Icons.email_outlined,
                  errorText: emailError,
                ),
                const SizedBox(height: 15),
                // Champ "Phone Number"
                _buildTextField(
                  controller: phoneController,
                  hintText: "Phone Number",
                  icon: Icons.phone_outlined,
                ),
                const SizedBox(height: 15),
                // Champ "Password"
                _buildPasswordField(),
                const SizedBox(height: 20),
                // Sélection du rôle (driver / passenger)
                _buildRoleSelection(),
                const SizedBox(height: 20),
                // Bouton "Sign Up"
                ElevatedButton(
                  onPressed: isLoading ? null : _signUp,
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
                          "Sign Up",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
                const SizedBox(height: 20),
                // Lien vers "Log In"
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Already have an account? ",
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.pushReplacementNamed(context, Routes.loginScreen);
                      },
                      child: const Text(
                        "Log In",
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

  /// Password Field avec toggle de visibilité
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

  /// Sélection du rôle
  Widget _buildRoleSelection() {
    return Column(
      children: [
        const Text(
          "Select Your Role",
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.black54,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildRoleButton(
                role: "driver",
                label: "Driver",
                icon: Icons.directions_car,
                color: Colors.orange,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildRoleButton(
                role: "passenger",
                label: "Passenger",
                icon: Icons.person,
                color: Colors.blue,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// Bouton stylé pour sélectionner le rôle
  Widget _buildRoleButton({
    required String role,
    required String label,
    required IconData icon,
    required Color color,
  }) {
    final bool isSelected = (selectedRole == role);
    return GestureDetector(
      onTap: () => setState(() => selectedRole = role),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.2) : Colors.white,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: isSelected ? color : Colors.grey.shade400,
            width: 2,
          ),
        ),
        width: double.infinity,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? color : Colors.grey,
              size: 24,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: isSelected ? color : Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
