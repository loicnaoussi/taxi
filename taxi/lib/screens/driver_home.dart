import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:taxi/themes/theme.dart';
import 'dart:async';
import 'package:taxi/screens/QrCodeScreen.dart';
import 'package:taxi/screens/EditInfoScreen.dart';
import 'package:share_plus/share_plus.dart';

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

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
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
          Image.asset(
            'assets/images/logo.png',
            height: 40,
            width: 40,
            fit: BoxFit.contain,
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
          icon: Icon(Icons.notifications_active,
              color: Colors.white.withOpacity(0.9)),
          onPressed: () {},
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

class DriverCodeScreen extends StatefulWidget {
  const DriverCodeScreen({super.key});

  @override
  State<DriverCodeScreen> createState() => _DriverCodeScreenState();
}

class _DriverCodeScreenState extends State<DriverCodeScreen> {
  String _code = '748588';
  bool _isCodeVisible = false;
  final _passwordController = TextEditingController();
  final _storedPassword = "1234";

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  void _startTimer() {}
  void _toggleCodeVisibility() async {
    final result = await showDialog(
      context: context,
      builder: (context) => _buildPasswordDialog(),
    );

    if (result == true) {
      setState(() => _isCodeVisible = true);
      await Future.delayed(Duration(seconds: 30), () {
        if (mounted) setState(() => _isCodeVisible = false);
      });
    }
  }

 void _shareTripDetails() async {
  
    final bool confirmShare = await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer le partage'),
        content: const Text(
          'Voulez-vous vraiment partager les informations du trajet ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );

    if (confirmShare == true) {
      final String driverName = "Jean Dupont";
      final String passengerName = "Marie Curie";
      final String departureLocation = "Paris, France";
      final String destination = "Lyon, France";

      final String shareMessage = """
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

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.primaryColor.withOpacity(0.1),
            Colors.white,
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            _buildCodeCard(),
            const SizedBox(height: 40),
            _buildActionButton(
              icon: Icons.warning_amber_rounded,
              text: 'Emergency Alert',
              onPressed: () => _showEmergencyDialog(),
            ),
            const SizedBox(height: 20),
            _buildActionButton(
              icon: Icons.edit_document,
              text: 'Update Profile',
              onPressed: _navigateToProfileEdit,
            ),
            const SizedBox(height: 20),
            // Nouveau bouton de partage
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

  Widget _buildPasswordDialog() {
    return AlertDialog(
      title: Text('Authentification Requise',
          style: TextStyle(color: AppTheme.primaryColor)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: InputDecoration(
              labelText: 'Mot de passe',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              suffixIcon: Icon(Icons.lock),
            ),
          ),
          SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('Annuler'),
              ),
              ElevatedButton(
                onPressed: () {
                  if (_passwordController.text == _storedPassword) {
                    Navigator.pop(context, true);
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Mot de passe incorrect')),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text('Confirmer'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCodeCard() {
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
            Text(
              'Code Sécurité',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey,
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 15),
            _isCodeVisible
                ? Text(
                    _code,
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
                      6,
                      (index) => Container(
                        margin: EdgeInsets.symmetric(horizontal: 8),
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withOpacity(0.5),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
            SizedBox(height: 10),
            Icon(
              _isCodeVisible ? Icons.visibility_off : Icons.visibility,
              color: Colors.grey,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(
      {required IconData icon,
      required String text,
      required VoidCallback onPressed}) {
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
            side: BorderSide(color: AppTheme.primaryColor.withOpacity(0.3)),
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

  void _showEmergencyDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Emergency Alert'),
        content: const Text(
            'Are you sure you want to send an emergency alert to authorities?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              // Implement emergency alert
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Emergency alert sent!')),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  void _navigateToProfileEdit() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const EditInfoScreen(),
      ),
    );
  }
}

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
    FilePickerResult? result = await FilePicker.platform.pickFiles();
    if (result != null) {
      setState(() {
        _files[fileType] = result.files.single.name;
      });
    }
  }

  void _submitVerification() {
    if (_files.values.any((v) => v == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload all required files')),
      );
      return;
    }
    // Submit implementation
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

  Widget _buildUploadCard(
      {required String title,
      required IconData icon,
      required String fileType}) {
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
            child:
                Text(_files[fileType] == null ? 'Upload File' : 'Change File'),
          ),
        ],
      ),
    );
  }
}
