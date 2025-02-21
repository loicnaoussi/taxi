import 'package:flutter/material.dart';
import 'package:taxi/themes/theme.dart';

class EmergencyContactsScreen extends StatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  State<EmergencyContactsScreen> createState() => _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends State<EmergencyContactsScreen> {
  final List<TextEditingController> _controllers =
      List.generate(3, (i) => TextEditingController());
  final List<Color> _contactColors = [Colors.red, Colors.orange, Colors.purple];

  // Ex: on peut en faire un booléen d’état de chargement
  bool isSaving = false;

  void _saveContacts() async {
    // Vérifier que les champs ne sont pas vides
    if (_controllers.any((c) => c.text.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez remplir tous les champs requis')),
      );
      return;
    }

    setState(() => isSaving = true);

    try {
      // Ex: POST /api/emergency/add
      // data: { contact_1, contact_2, contact_3 }
      // Gérer la logique de sauvegarde
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contacts d\'urgence enregistrés')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    } finally {
      setState(() => isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contacts d\'Urgence'),
        backgroundColor: AppTheme.primaryColor,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
        ),
      ),
      body: SingleChildScrollView(
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
          'Sécurité Personnelle',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Ajoutez 3 contacts de confiance à prévenir en cas d\'urgence',
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
                    labelText: 'Contact ${index + 1}',
                    hintText: 'Entrez le numéro de téléphone',
                    border: InputBorder.none,
                    suffixIcon: IconButton(
                      icon: Icon(Icons.contacts_rounded,
                          color: _contactColors[index]),
                      onPressed: () {
                        // Sélecteur de contact
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
        icon: const Icon(Icons.shield_rounded),
        label: isSaving
            ? const CircularProgressIndicator(color: Colors.white)
            : const Text('ENREGISTRER LES CONTACTS'),
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
