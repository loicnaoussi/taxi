// lib/screens/passenger_home.dart

import 'package:flutter/material.dart';
import 'package:taxi/screens/gps_screen.dart';
import 'package:taxi/screens/edit_info_screen.dart';
import 'package:taxi/screens/identification_screen.dart';
import 'package:taxi/screens/emergency_contacts_screen.dart';
import 'package:taxi/themes/theme.dart';

class PassengerHomeScreen extends StatefulWidget {
  const PassengerHomeScreen({super.key});

  @override
  State<PassengerHomeScreen> createState() => _PassengerHomeScreenState();
}

class _PassengerHomeScreenState extends State<PassengerHomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const GpsScreen(),
    const EditInfoScreen(),
    const IdentificationScreen(),
    const EmergencyContactsScreen(),
  ];

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Passenger Home'),
        backgroundColor: AppTheme.primaryColor,
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
        backgroundColor: AppTheme.primaryColor,
        selectedItemColor: Colors.white,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.gps_fixed),
            label: 'GPS',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.edit),
            label: 'Edit Info',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.verified),
            label: 'Identification',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.emergency),
            label: 'Emergency Contacts',
          ),
        ],
      ),
    );
  }
}