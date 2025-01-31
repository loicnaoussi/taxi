import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:async';
import 'dart:math';

class DriverHome extends StatefulWidget {
  const DriverHome({super.key});

  @override
  _DriverHomeState createState() => _DriverHomeState();
}

class _DriverHomeState extends State<DriverHome> {
  String qrCode = '';
  int randomCode = 0;
  DateTime? lastRegenerationTime;

  @override
  void initState() {
    super.initState();
    _generateRandomCode();
    Timer.periodic(const Duration(hours: 2), (Timer timer) {
      _generateRandomCode();
    });
  }

  void _generateRandomCode() {
    final random = Random();
    setState(() {
      randomCode = random.nextInt(9999);
      lastRegenerationTime = DateTime.now();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Panneau de pilotage du Conducteur'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              // Ajoutez la logique de déconnexion ici
            },
          ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: _buildBottomNavigationBar(),
    );
  }

  Widget _buildBody() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Code: $randomCode',
            style: const TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Dernière mis à jour: ${_formatTime(lastRegenerationTime)}',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime? time) {
    if (time == null) return 'Jamais mis à jour';
    return time.toString().split(' ').last.split('.')[0];
  }

  BottomNavigationBar _buildBottomNavigationBar() {
    return BottomNavigationBar(
      currentIndex: 0,
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.numbers),
          label: 'Code',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.qr_code),
          label: 'QR Code',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.file_upload),
          label: 'Vérification',
        ),
      ],
      onTap: (int index) {
        setState(() {
          // Met à jour l'onglet sélectionné
        });
      },
    );
  }
}