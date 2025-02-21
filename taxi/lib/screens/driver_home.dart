import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/routes/routes.dart';
import 'package:taxi/screens/QrCodeScreen.dart';
import 'package:taxi/screens/EditInfoScreen.dart';
import 'package:taxi/screens/notifications_screen.dart'; // si vous avez un écran de notifications
import 'package:taxi/themes/theme.dart';
import 'package:taxi/config.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const DriverCodeScreen(),
    const QrCodeScreen(),
    const VerificationScreen(),
  ];

  // Quand on tape sur un des items du BottomNav
  void _onTabTapped(int index) {
    setState(() => _currentIndex = index);
  }

  // Fonction de déconnexion
  Future<void> _logout() async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Déconnexion"),
        content: const Text("Voulez-vous vraiment vous déconnecter ?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Confirmer"),
          ),
        ],
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      ),
    );

    if (confirm == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      await prefs.remove('user_type');
      Navigator.pushReplacementNamed(context, Routes.loginScreen);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildPremiumAppBar(),
      body: _pages[_currentIndex],
      bottomNavigationBar: _buildFancyNavBar(),
    );
  }

  PreferredSizeWidget _buildPremiumAppBar() {
    return AppBar(
      backgroundColor: AppTheme.primaryColor,
      elevation: 4,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          bottom: Radius.circular(25),
        ),
      ),
      flexibleSpace: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.primaryColor,
              AppTheme.primaryColor.withOpacity(0.9),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 15,
              spreadRadius: 2,
            )
          ],
        ),
      ),
      title: Row(
        children: [
          // Avatar
          GestureDetector(
            onTap: () {
              // Ouvrir un menu compte ?
            },
            child: CircleAvatar(
              radius: 20,
              backgroundColor: Colors.white,
              child: Icon(
                Icons.person,
                size: 24,
                color: AppTheme.primaryColor.withOpacity(0.8),
              ),
            ),
          ),
          const SizedBox(width: 15),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Driver Connect',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                ),
              ),
              Text(
                'Professional Portal',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.9),
                  fontSize: 14,
                  fontWeight: FontWeight.w300,
                ),
              ),
            ],
          ),
        ],
      ),
      centerTitle: false,
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_active, color: Colors.white),
          onPressed: () {
            // Aller sur la page notifications
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const NotificationsScreen()),
            );
          },
        ),
        // Bouton de logout
        IconButton(
          icon: const Icon(Icons.exit_to_app, color: Colors.white),
          tooltip: 'Se déconnecter',
          onPressed: _logout,
        ),
      ],
    );
  }

  Widget _buildFancyNavBar() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.3),
            blurRadius: 10,
            spreadRadius: 2,
          )
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabTapped,
          backgroundColor: Colors.white,
          selectedItemColor: AppTheme.primaryColor,
          unselectedItemColor: Colors.grey[600],
          showSelectedLabels: false,
          showUnselectedLabels: false,
          type: BottomNavigationBarType.fixed,
          items: [
            BottomNavigationBarItem(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _currentIndex == 0
                      ? AppTheme.primaryColor.withOpacity(0.2)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.security_rounded),
              ),
              label: 'Code',
            ),
            BottomNavigationBarItem(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _currentIndex == 1
                      ? AppTheme.primaryColor.withOpacity(0.2)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.qr_code_scanner_rounded),
              ),
              label: 'QR',
            ),
            BottomNavigationBarItem(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _currentIndex == 2
                      ? AppTheme.primaryColor.withOpacity(0.2)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.verified_user_rounded),
              ),
              label: 'Verify',
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// DriverCodeScreen : code de sécurité
// ---------------------------------------------------------------------------
class DriverCodeScreen extends StatefulWidget {
  const DriverCodeScreen({super.key});

  @override
  State<DriverCodeScreen> createState() => _DriverCodeScreenState();
}

class _DriverCodeScreenState extends State<DriverCodeScreen> {
  String? _code;
  bool _isCodeVisible = false;
  final _passwordController = TextEditingController();

  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchSecurityCode();

    // On rafraîchit le code toutes les 2h
    _refreshTimer = Timer.periodic(const Duration(hours: 2), (timer) {
      _fetchSecurityCode();
    });
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchSecurityCode() async {
    try {
      final token = await _getToken();
      final response = await Dio().get(
        "${Config.baseUrl}/api/auth/security-code",
        options: Options(headers: {
          "Authorization": "Bearer $token",
        }),
      );
      if (response.statusCode == 200 && response.data["code"] != null) {
        setState(() => _code = response.data["code"]);
      } else {
        setState(() => _code = "------");
      }
    } catch (e) {
      setState(() => _code = "Erreur");
    }
  }

  Future<bool> _checkPassword(String password) async {
    try {
      final token = await _getToken();
      final response = await Dio().post(
        "${Config.baseUrl}/api/auth/check-password",
        data: {"password": password},
        options: Options(headers: {
          "Authorization": "Bearer $token",
        }),
      );
      if (response.statusCode == 200) {
        return response.data["valid"] == true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<void> _toggleCodeVisibility() async {
    final bool success = await _showPasswordDialog();
    if (!success) return;

    setState(() => _isCodeVisible = true);
    await Future.delayed(const Duration(seconds: 30), () {
      if (mounted) setState(() => _isCodeVisible = false);
    });
  }

  Future<bool> _showPasswordDialog() async {
    _passwordController.clear();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Authentification Requise',
          style: TextStyle(color: AppTheme.primaryColor),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Mot de passe',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                suffixIcon: const Icon(Icons.lock),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Annuler'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final valid = await _checkPassword(_passwordController.text);
                    if (!valid) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Mot de passe incorrect')),
                      );
                      return;
                    }
                    Navigator.pop(context, true);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                  ),
                  child: const Text('Confirmer'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    return result == true;
  }

  Future<void> _shareTripDetails() async {
    final bool? confirmShare = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer le partage'),
        content: const Text('Voulez-vous partager les informations du trajet ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );

    if (confirmShare == true) {
      final driverName = "Jean Dupont";
      final passengerName = "Marie Curie";
      final departureLocation = "Paris, France";
      final destination = "Lyon, France";

      final shareMessage = """
🚖 Informations du trajet :

Conducteur : $driverName
Passager : $passengerName
Départ : $departureLocation
Destination : $destination

Partagez ce trajet avec un autre utilisateur !
""";
      Share.share(shareMessage);
    }
  }

  void _showEmergencyDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Emergency Alert'),
        content: const Text('Are you sure you want to send an emergency alert?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _sendEmergencyAlert();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  Future<void> _sendEmergencyAlert() async {
    try {
      final token = await _getToken();
      final response = await Dio().post(
        "${Config.baseUrl}/api/verifications/emergency-alert",
        options: Options(headers: {
          "Authorization": "Bearer $token",
        }),
      );
      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Emergency alert sent!')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Emergency alert failed!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Network error: $e')),
      );
    }
  }

  void _navigateToProfileEdit() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const EditInfoScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayedCode = _code ?? "------";

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withOpacity(0.1),
            Colors.white,
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildCodeCard(displayedCode),
            const SizedBox(height: 40),
            _buildActionButton(
              icon: Icons.warning_amber_rounded,
              text: 'Emergency Alert',
              onPressed: _showEmergencyDialog,
            ),
            const SizedBox(height: 20),
            _buildActionButton(
              icon: Icons.edit_document,
              text: 'Update Profile',
              onPressed: _navigateToProfileEdit,
            ),
            const SizedBox(height: 20),
            _buildActionButton(
              icon: Icons.share,
              text: 'Share Trip',
              onPressed: _shareTripDetails,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCodeCard(String displayedCode) {
    return GestureDetector(
      onTap: _toggleCodeVisibility,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.2),
              blurRadius: 10,
              spreadRadius: 3,
            )
          ],
        ),
        child: Column(
          children: [
            const Text(
              'Code Sécurité',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 15),
            _isCodeVisible
                ? Text(
                    displayedCode,
                    style: TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4,
                      color: AppTheme.primaryColor,
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      displayedCode.length,
                      (index) => Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withOpacity(0.5),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
            const SizedBox(height: 10),
            Icon(
              _isCodeVisible ? Icons.visibility_off : Icons.visibility,
              color: Colors.grey,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String text,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: MediaQuery.of(context).size.width * 0.7,
      child: ElevatedButton.icon(
        icon: Icon(icon, size: 24),
        label: Text(text),
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: AppTheme.primaryColor,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
            side: BorderSide(
              color: AppTheme.primaryColor.withOpacity(0.3),
            ),
          ),
          elevation: 3,
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// VerificationScreen : upload documents
// ---------------------------------------------------------------------------
class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final Map<String, String?> _files = {
    'photo': null,
    'video': null,
    'cni': null,
    'card': null,
  };

  Future<void> _pickFile(String fileType) async {
    final result = await FilePicker.platform.pickFiles();
    if (result != null && result.files.single.path != null) {
      setState(() {
        _files[fileType] = result.files.single.path;
      });
    }
  }

  Future<void> _submitVerification() async {
    if (_files.values.any((v) => v == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload all required files')),
      );
      return;
    }

    try {
      final token = await _getToken();
      final dio = Dio();

      // envoi un par un
      for (final entry in _files.entries) {
        final key = entry.key;
        final path = entry.value!;
        final formData = FormData.fromMap({
          key: await MultipartFile.fromFile(
            path,
            filename: path.split('/').last,
          ),
        });

        final response = await dio.post(
          "${Config.baseUrl}/api/verifications/upload-verification",
          data: formData,
          options: Options(
            headers: {
              "Authorization": "Bearer $token",
              "Content-Type": "multipart/form-data",
            },
          ),
        );
        if (response.statusCode != 201) {
          // Gérer l'erreur si besoin
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Documents submitted successfully!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload error: $e')),
      );
    }
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Document Verification',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 20),
          ..._buildUploadSections(),
          const SizedBox(height: 30),
          ElevatedButton(
            onPressed: _submitVerification,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(15),
              ),
            ),
            child: const Text(
              'Submit Verification',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildUploadSections() {
    return [
      _buildUploadCard(
        title: 'Profile Photo',
        icon: Icons.camera_alt_rounded,
        fileType: 'photo',
      ),
      _buildUploadCard(
        title: 'Introduction Video',
        icon: Icons.videocam_rounded,
        fileType: 'video',
      ),
      _buildUploadCard(
        title: 'National ID',
        icon: Icons.credit_card_rounded,
        fileType: 'cni',
      ),
      _buildUploadCard(
        title: 'Vehicle Registration',
        icon: Icons.directions_car_rounded,
        fileType: 'card',
      ),
    ];
  }

  Widget _buildUploadCard({
    required String title,
    required IconData icon,
    required String fileType,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            spreadRadius: 3,
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppTheme.primaryColor),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_files[fileType] != null)
            Text(
              _files[fileType]!,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
          const SizedBox(height: 10),
          ElevatedButton(
            onPressed: () => _pickFile(fileType),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
              foregroundColor: AppTheme.primaryColor,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              _files[fileType] == null ? 'Upload File' : 'Change File',
            ),
          ),
        ],
      ),
    );
  }
}
