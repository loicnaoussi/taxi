import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/themes/theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _notifications = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');

      // Exemple d'appel à votre backend
      final response = await Dio().get(
        "http://votre-backend/api/notifications/my-notifications",
        options: Options(headers: {
          "Authorization": "Bearer $token",
        }),
      );
      if (response.statusCode == 200) {
        setState(() {
          // On suppose que la réponse est du type :
          // { notifications: [ {notification_id, title, message, ...} ] }
          _notifications =
              List<Map<String, dynamic>>.from(response.data["notifications"]);
        });
      }
    } catch (e) {
      // Gérer l'erreur
      debugPrint("Erreur notif: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> _markAllAsRead() async {
    // Optionnel : Endpoint pour marquer comme lues
    // POST /api/notifications/mark-all-read par ex...
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Notifications'),
        backgroundColor: AppTheme.primaryColor,
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            onPressed: () {
              _markAllAsRead();
              // Visuellement, on peut vider la liste
              setState(() => _notifications.clear());
            },
            tooltip: 'Tout marquer comme lu',
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text("Aucune notification"))
              : ListView.builder(
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final item = _notifications[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      child: ListTile(
                        leading: const Icon(Icons.notifications, color: Colors.blue),
                        title: Text(item["title"] ?? "Notification"),
                        subtitle: Text(item["message"] ?? ""),
                      ),
                    );
                  },
                ),
    );
  }
}
