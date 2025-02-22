import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/routes/routes.dart';
import 'package:dio/dio.dart';
import 'package:taxi/config.dart'; // Assurez-vous d'avoir créé ce fichier

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _controller.forward();

    // Après 3 secondes, vérifiez le token et essayez de le rafraîchir
    Future.delayed(const Duration(seconds: 3), () async {
      final prefs = await SharedPreferences.getInstance();
      String? token = prefs.getString('token');
      final String? userType = prefs.getString('user_type');

      if (token != null && token.isNotEmpty) {
        // ignore: unused_local_variable
        bool refreshed = await _refreshTokenIfNeeded();
        token = prefs.getString('token'); // Met à jour le token après rafraîchissement
        if (token != null && token.isNotEmpty) {
          // Navigation en fonction du userType
          if (userType == 'driver') {
            Navigator.pushReplacementNamed(context, Routes.driverHome);
          } else {
            Navigator.pushReplacementNamed(context, Routes.passengerHome);
          }
          return;
        }
      }
      // Pas de token valide, redirige vers l'écran de login
      Navigator.pushReplacementNamed(context, Routes.loginScreen);
    });
  }

  // Méthode pour rafraîchir le token via l'endpoint dédié
  Future<bool> _refreshTokenIfNeeded() async {
    final prefs = await SharedPreferences.getInstance();
    final refreshToken = prefs.getString('refresh_token');
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final dio = Dio();
      final response = await dio.post(
        "${Config.baseUrl}/api/auth/refresh-token", // Utilisez Config.baseUrl ici
        data: {"refresh_token": refreshToken},
      );
      if (response.statusCode == 200) {
        final newAccessToken = response.data["accessToken"];
        final newRefreshToken = response.data["refreshToken"];
        await prefs.setString('token', newAccessToken);
        await prefs.setString('refresh_token', newRefreshToken);
        return true;
      }
    } catch (e) {
      debugPrint("Erreur de rafraîchissement du token: $e");
    }
    return false;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        // Fond dégradé
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.blue.shade900,
              Colors.blue.shade600,
            ],
          ),
        ),
        child: Stack(
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Animation scale du logo
                  AnimatedBuilder(
                    animation: _scaleAnimation,
                    builder: (context, child) => Transform.scale(
                      scale: _scaleAnimation.value,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        padding: const EdgeInsets.all(20),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: Image.asset(
                            'assets/images/logo.png',
                            width: 150,
                            height: 150,
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                  // Animation fade du texte
                  FadeTransition(
                    opacity: _opacityAnimation,
                    child: const Text(
                      'Your Ride, Our Priority',
                      style: TextStyle(
                        fontSize: 20,
                        color: Colors.white,
                        fontWeight: FontWeight.w300,
                        letterSpacing: 1.1,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Barre de progression en bas
            Positioned(
              bottom: 50,
              left: 0,
              right: 0,
              child: TweenAnimationBuilder(
                tween: Tween<double>(begin: 0, end: 1),
                duration: const Duration(seconds: 3),
                builder: (context, double value, _) => LinearProgressIndicator(
                  value: value,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Colors.white.withOpacity(0.8),
                  ),
                  minHeight: 4,
                ),
              ),
            ),
            // Version de l'app
            Positioned(
              bottom: 20,
              left: 0,
              right: 0,
              child: Text(
                'Version 1.0.0',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
