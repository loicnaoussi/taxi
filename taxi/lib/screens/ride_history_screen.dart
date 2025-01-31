
import 'package:flutter/material.dart';
import 'package:taxi/themes/theme.dart';

class RideHistoryScreen extends StatelessWidget {
  const RideHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Données fictives pour l'historique des trajets
    final List<Map<String, String>> rideHistory = [
      {
        'date': '2025-01-31',
        'time': '14:30',
        'start': '123 Main St',
        'end': '456 Elm St',
        'cost': '\$15.00',
      },
      {
        'date': '2025-01-30',
        'time': '10:45',
        'start': '789 Oak St',
        'end': '321 Pine St',
        'cost': '\$20.00',
      },
      {
        'date': '2025-01-29',
        'time': '09:00',
        'start': '654 Maple St',
        'end': '987 Birch St',
        'cost': '\$12.50',
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ride History'),
        centerTitle: true,
        backgroundColor: AppTheme.primaryColor,
      ),
      body: ListView.builder(
        itemCount: rideHistory.length,
        itemBuilder: (context, index) {
          final ride = rideHistory[index];
          return Card(
            margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            elevation: 3,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Date: ${ride['date']}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Time: ${ride['time']}',
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'From: ${ride['start']}',
                    style: const TextStyle(fontSize: 16),
                  ),
                  Text(
                    'To: ${ride['end']}',
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Cost: ${ride['cost']}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}