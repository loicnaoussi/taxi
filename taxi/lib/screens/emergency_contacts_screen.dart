import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/config.dart'; // Use Config.baseUrl
import 'package:taxi/themes/theme.dart';
import 'package:taxi/routes/routes.dart';

class EmergencyContactsScreen extends StatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  State<EmergencyContactsScreen> createState() =>
      _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends State<EmergencyContactsScreen> {
  // Three controllers for three contacts
  final List<TextEditingController> _controllers =
      List.generate(3, (i) => TextEditingController());
  // Colors to distinguish each contact field
  final List<Color> _contactColors = [Colors.red, Colors.orange, Colors.purple];

  bool isLoading = false;
  bool isSaving = false;
  // List to store the IDs of existing contacts (for deletion during update)
  List<int> _existingContactIds = [];

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  // Retrieve emergency contacts from the backend
  Future<void> _loadContacts() async {
    setState(() => isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) throw 'Utilisateur non authentifié';

      final response = await Dio().get(
        "${Config.baseUrl}/api/emergency/my-contacts",
        options: Options(headers: {"Authorization": "Bearer $token"}),
      );

      if (response.statusCode == 200) {
        final List contacts = response.data is List ? response.data : [];
        _existingContactIds.clear();
        // For each field, pre-fill the phone number if a contact exists, and store its ID.
        for (int i = 0; i < 3; i++) {
          if (i < contacts.length) {
            _controllers[i].text = contacts[i]["contact_phone"] ?? "";
            _existingContactIds.add(contacts[i]["contact_id"]);
          } else {
            _controllers[i].clear();
          }
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text("Erreur lors du chargement des contacts")),
        );
      }
    } on DioError catch (e) {
      if (e.response?.statusCode == 401) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text(
                  "Votre session a expiré, veuillez vous reconnecter.")),
        );
        Navigator.pushReplacementNamed(context, Routes.loginScreen);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  "Erreur lors du chargement des contacts: ${e.message}")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text("Erreur lors du chargement des contacts: $e")),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }

  // Save (update) emergency contacts to the backend
  Future<void> _saveContacts() async {
    // Ensure all fields are filled
    if (_controllers.any((c) => c.text.trim().isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text("Veuillez remplir tous les champs requis")),
      );
      return;
    }

    setState(() => isSaving = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) throw 'Utilisateur non authentifié';

      final dio = Dio();
      // First, delete all existing contacts
      for (final contactId in _existingContactIds) {
        await dio.delete(
          "${Config.baseUrl}/api/emergency/delete/$contactId",
          options: Options(headers: {"Authorization": "Bearer $token"}),
        );
      }
      _existingContactIds.clear();

      // Then, add each contact via the API
      for (int i = 0; i < _controllers.length; i++) {
        final phone = _controllers[i].text.trim();
        if (phone.isNotEmpty) {
          final contactName = "Contact ${i + 1}";
          final response = await dio.post(
            "${Config.baseUrl}/api/emergency/add",
            data: {"contact_name": contactName, "contact_phone": phone},
            options: Options(headers: {"Authorization": "Bearer $token"}),
          );
          if (response.statusCode == 201) {
            _existingContactIds.add(response.data["contact_id"]);
          } else {
            throw "Erreur lors de l'ajout du contact ${i + 1}";
          }
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text("Contacts d'urgence enregistrés avec succès")),
      );
    } on DioError catch (e) {
      if (e.response?.statusCode == 401) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text(
                  "Votre session a expiré, veuillez vous reconnecter.")),
        );
        Navigator.pushReplacementNamed(context, Routes.loginScreen);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Erreur: ${e.message}")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur: $e")),
      );
    } finally {
      setState(() => isSaving = false);
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Contacts d'urgence"),
        backgroundColor: AppTheme.primaryColor,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  _buildHeader(),
                  const SizedBox(height: 30),
                  ...List.generate(3, (index) => _buildContactCard(index)),
                  const SizedBox(height: 40),
                  _buildSaveButton(),
                ],
              ),
            ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Sécurité Personnelle",
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          "Modifiez vos contacts d'urgence. Les numéros actuels sont affichés.",
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[600],
            height: 1.4,
          ),
        ),
      ],
    );
  }

  Widget _buildContactCard(int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                _contactColors[index].withOpacity(0.1),
                _contactColors[index].withOpacity(0.05),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _contactColors[index].withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.emergency_rounded,
                  color: _contactColors[index],
                  size: 28,
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: TextFormField(
                  controller: _controllers[index],
                  decoration: InputDecoration(
                    labelText: "Contact ${index + 1}",
                    hintText: "Entrez le numéro de téléphone",
                    border: InputBorder.none,
                    suffixIcon: IconButton(
                      icon: Icon(
                        Icons.contacts_rounded,
                        color: _contactColors[index],
                      ),
                      onPressed: () {
                        // Optionally integrate a contacts picker here
                      },
                    ),
                  ),
                  keyboardType: TextInputType.phone,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: isSaving
            ? const CircularProgressIndicator(color: Colors.white)
            : const Icon(Icons.shield_rounded),
        label: isSaving
            ? const Text("")
            : const Text("ENREGISTRER LES CONTACTS"),
        onPressed: isSaving ? null : _saveContacts,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
          elevation: 3,
          shadowColor: AppTheme.primaryColor.withOpacity(0.3),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}
