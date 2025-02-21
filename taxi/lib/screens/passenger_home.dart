import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/screens/edit_info_screen.dart';
import 'package:taxi/screens/identification_screen.dart';
import 'package:taxi/screens/emergency_contacts_screen.dart';
import 'package:taxi/screens/notifications_screen.dart';
import 'package:taxi/screens/gps_scan.dart'; // Écran qui affiche la carte/GPS
import 'package:taxi/screens/qr_scan_screen.dart'; // Écran qui ouvre la caméra pour scanner un QR code
import 'package:taxi/themes/theme.dart';
import 'package:taxi/routes/routes.dart';

class PassengerHomeScreen extends StatefulWidget {
  const PassengerHomeScreen({super.key});

  @override
  State<PassengerHomeScreen> createState() => _PassengerHomeScreenState();
}

class _PassengerHomeScreenState extends State<PassengerHomeScreen> {
  int _currentIndex = 0;
  String? _profileImageUrl;

  // Liste des pages : 0 => carte, 1 => EditInfo, 2 => Identification, 3 => Emergency Contacts.
  final List<Widget> _pages = [
    const GpsScanScreen(),
    const EditInfoScreen(),
    const IdentificationScreen(),
    const EmergencyContactsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _loadProfileImage();
  }

  // Charger l'URL de la photo de profil depuis SharedPreferences
  Future<void> _loadProfileImage() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _profileImageUrl = prefs.getString('profileImageUrl');
    });
  }

  // Navigation du BottomNavigationBar
  void _onTabTapped(int index) {
    setState(() => _currentIndex = index);
  }

  // Méthode de déconnexion avec confirmation
  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Déconnexion"),
        content: const Text("Êtes-vous sûr de vouloir vous déconnecter ?"),
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
      ),
    );
    if (confirm == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      await prefs.remove('user_type');
      Navigator.pushReplacementNamed(context, Routes.loginScreen);
    }
  }

  // Ouvre l'écran de scan QR
  void _openQrScanner() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const QrScanScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          _buildTopHeader(),
          Expanded(child: _pages[_currentIndex]),
        ],
      ),
      bottomNavigationBar: _buildFancyNavBar(),
    );
  }

  /// Barre d’entête avec avatar, logo, QR scan, notifications et déconnexion
  Widget _buildTopHeader() {
    return Container(
      height: 100,
      padding: const EdgeInsets.symmetric(horizontal: 15),
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
            color: Colors.black.withOpacity(0.1),
            blurRadius: 12,
            spreadRadius: 4,
          )
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Avatar de l'utilisateur
            GestureDetector(
              onTap: () {
                // Exemple: ouvrir un menu de compte ou un modal
              },
              child: CircleAvatar(
                radius: 22,
                backgroundColor: Colors.white,
                backgroundImage: _profileImageUrl != null && _profileImageUrl!.isNotEmpty
                    ? NetworkImage(_profileImageUrl!)
                    : const AssetImage('assets/images/default_profile.png') as ImageProvider,
              ),
            ),
            const Spacer(),
            // Logo
            Image.asset(
              'assets/images/logo.png',
              height: 50,
              fit: BoxFit.contain,
            ),
            const Spacer(),
            // Bouton pour scanner un QR Code
            IconButton(
              icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
              tooltip: 'Scanner un QR Code',
              onPressed: _openQrScanner,
            ),
            // Bouton Notifications
            IconButton(
              icon: const Icon(Icons.notifications_active, color: Colors.white),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                );
              },
            ),
            // Bouton Déconnexion
            IconButton(
              icon: const Icon(Icons.exit_to_app, color: Colors.white),
              tooltip: 'Se déconnecter',
              onPressed: _logout,
            ),
          ],
        ),
      ),
    );
  }

  /// BottomNavigationBar personnalisé
  Widget _buildFancyNavBar() {
    return Container(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            blurRadius: 16,
            spreadRadius: 4,
          )
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabTapped,
          backgroundColor: Colors.white,
          selectedItemColor: AppTheme.primaryColor,
          unselectedItemColor: Colors.grey[600],
          showSelectedLabels: false,
          showUnselectedLabels: false,
          type: BottomNavigationBarType.fixed,
          elevation: 12,
          items: [
            _buildNavItem(Icons.navigation_rounded, 0),
            _buildNavItem(Icons.edit_note_rounded, 1),
            _buildNavItem(Icons.verified_rounded, 2),
            _buildNavItem(Icons.emergency_rounded, 3),
          ],
        ),
      ),
    );
  }

  BottomNavigationBarItem _buildNavItem(IconData icon, int index) {
    return BottomNavigationBarItem(
      icon: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: _currentIndex == index
              ? AppTheme.primaryColor.withOpacity(0.15)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(
          icon,
          size: 28,
          color: _currentIndex == index ? AppTheme.primaryColor : Colors.grey[600],
        ),
      ),
      label: '',
    );
  }
}
