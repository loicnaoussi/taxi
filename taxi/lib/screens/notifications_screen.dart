import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/config.dart';
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
      if (token == null || token.isEmpty) {
        throw "Utilisateur non authentifié.";
      }

      // Call the backend using the baseUrl from config.dart
      final response = await Dio().get(
        "${Config.baseUrl}/api/notifications/my-notifications",
        options: Options(
          headers: {"Authorization": "Bearer $token"},
          // To avoid exceptions for certain HTTP codes, you might customize validateStatus:
          validateStatus: (status) => status != null && status < 500,
        ),
      );
      if (response.statusCode == 200) {
        setState(() {
          // Expecting response to be like: { "notifications": [ {...}, {...} ] }
          _notifications =
              List<Map<String, dynamic>>.from(response.data["notifications"] ?? []);
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Erreur lors du chargement des notifications")),
        );
      }
    } catch (e) {
      debugPrint("Erreur notif: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur lors du chargement des notifications: $e")),
      );
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null || token.isEmpty) throw "Utilisateur non authentifié.";

      final response = await Dio().put(
        "${Config.baseUrl}/api/notifications/mark-as-read",
        options: Options(headers: {"Authorization": "Bearer $token"}),
      );
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Toutes les notifications ont été marquées comme lues.")),
        );
        // Clear the local list to reflect that they are read
        setState(() => _notifications.clear());
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Aucune notification à marquer comme lue.")),
        );
      }
    } catch (e) {
      debugPrint("Erreur lors de la mise à jour des notifications: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur: $e")),
      );
    }
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
            tooltip: 'Tout marquer comme lu',
            onPressed: _markAllAsRead,
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text("Aucune notification"))
              : RefreshIndicator(
                  onRefresh: _fetchNotifications,
                  child: ListView.builder(
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final item = _notifications[index];
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        child: ListTile(
                          leading: const Icon(Icons.notifications, color: Colors.blue),
                          title: Text(item["title"] ?? "Notification"),
                          subtitle: Text(item["message"] ?? ""),
                          trailing: Text(
                            item["created_at"] != null
                                ? item["created_at"].toString().substring(0, 16)
                                : "",
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
