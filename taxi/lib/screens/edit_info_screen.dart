import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/themes/theme.dart';

class EditInfoScreen extends StatefulWidget {
  const EditInfoScreen({super.key});

  @override
  State<EditInfoScreen> createState() => _EditInfoScreenState();
}

class _EditInfoScreenState extends State<EditInfoScreen> {
  // Contrôleurs de texte
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  // Contrôleurs contacts d’urgence
  final TextEditingController _emergencyContact1Controller = TextEditingController();
  final TextEditingController _emergencyContact2Controller = TextEditingController();

  File? _selectedImageFile;

  // Pour une meilleure UX, on peut ajouter un booléen d’état de chargement
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
  }

  // Chargement des infos utilisateur depuis le backend
  Future<void> _loadUserInfo() async {
    // Ex: GET /api/users/profile
    // Remplacez la logique ici pour peupler _nameController, _phoneController, etc.
    try {
      final token = await _getToken();
      final response = await Dio().get(
        "http://votre-backend/api/users/profile",
        options: Options(headers: {
          "Authorization": "Bearer $token"
        }),
      );
      if (response.statusCode == 200) {
        final data = response.data["user"]; 
        setState(() {
          _nameController.text = data["full_name"] ?? "";
          _phoneController.text = data["phone_number"] ?? "";
          // etc.
        });
      }
    } catch (e) {
      // Gérer l’erreur
    }
  }

  // Récupération du token
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString("token");
  }

  // Récupération / prise de la photo
  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedFile = await ImagePicker().pickImage(source: source);
      if (pickedFile != null) {
        setState(() {
          _selectedImageFile = File(pickedFile.path);
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: $e'),
          backgroundColor: Colors.red[800],
        ),
      );
    }
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(25)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 20,
              spreadRadius: 2,
            )
          ],
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildSourceOption(
                icon: Icons.camera_enhance_rounded,
                label: 'Prendre une photo',
                color: AppTheme.primaryColor,
                onTap: () => _pickImage(ImageSource.camera),
              ),
              _buildSourceOption(
                icon: Icons.photo_library_rounded,
                label: 'Choisir depuis la galerie',
                color: Colors.blue[700]!,
                onTap: () => _pickImage(ImageSource.gallery),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSourceOption({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: color),
      ),
      title: Text(
        label,
        style: TextStyle(
          color: Colors.grey[800],
          fontWeight: FontWeight.w500,
        ),
      ),
      onTap: () {
        Navigator.pop(context);
        onTap();
      },
    );
  }

  // Enregistrement des infos
  Future<void> _saveInfo() async {
    setState(() => isLoading = true);

    try {
      final token = await _getToken();

      // 1) Uploader l'image si besoin
      if (_selectedImageFile != null) {
        final formData = FormData.fromMap({
          "profile_image": await MultipartFile.fromFile(
            _selectedImageFile!.path,
            filename: _selectedImageFile!.path.split('/').last,
          )
        });
        // ignore: unused_local_variable
        final resp = await Dio().post(
          "http://votre-backend/api/users/upload-photo",
          data: formData,
          options: Options(headers: {
            "Authorization": "Bearer $token",
            "Content-Type": "multipart/form-data"
          }),
        );
        // Gérer la réponse...
      }

      // 2) Mise à jour du nom, téléphone, contacts d’urgence
      final updateData = {
        "full_name": _nameController.text.trim(),
        "phone_number": _phoneController.text.trim(),
        // etc.
      };

      // ignore: unused_local_variable
      final updateResp = await Dio().put(
        "http://votre-backend/api/auth/update",
        data: updateData,
        options: Options(headers: {
          "Authorization": "Bearer $token"
        }),
      );
      // Gérer la réponse...

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Text('Modifications sauvegardées', style: TextStyle(color: Colors.white)),
            ],
          ),
          backgroundColor: Colors.green[700],
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildProfileSection(),
            const SizedBox(height: 30),
            _buildInputSection(),
            const SizedBox(height: 30),
            _buildSaveButton(),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppTheme.primaryColor,
      elevation: 0,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          bottom: Radius.circular(20),
        ),
      ),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
        onPressed: () => Navigator.pop(context),
      ),
      title: const Text(
        'Modifier le profil',
        style: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildProfileSection() {
    return Column(
      children: [
        Stack(
          alignment: Alignment.bottomRight,
          children: [
            Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppTheme.primaryColor.withOpacity(0.3),
                  width: 3,
                ),
              ),
              child: ClipOval(
                child: Material(
                  color: Colors.grey[200],
                  child: InkWell(
                    onTap: _showImageSourceDialog,
                    child: _selectedImageFile != null
                        ? Image.file(_selectedImageFile!, fit: BoxFit.cover)
                        : Icon(Icons.person_rounded, size: 50, color: Colors.grey[500]),
                  ),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    spreadRadius: 2,
                  )
                ],
              ),
              child: const Icon(
                Icons.edit_rounded,
                size: 20,
                color: Colors.white,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          'Changer la photo de profil',
          style: TextStyle(
            color: AppTheme.primaryColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildInputSection() {
    return Column(
      children: [
        _buildInputField(
          icon: Icons.person_outline_rounded,
          label: 'Nom complet',
          controller: _nameController,
          color: Colors.blue[700]!,
        ),
        _buildInputField(
          icon: Icons.phone_iphone_rounded,
          label: 'Numéro de téléphone',
          controller: _phoneController,
          color: Colors.green[700]!,
        ),
        const SizedBox(height: 20),
        _buildEmergencySection(),
      ],
    );
  }

  Widget _buildInputField({
    required IconData icon,
    required String label,
    required TextEditingController controller,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: TextFormField(
        controller: controller,
        style: TextStyle(
          color: Colors.grey[800],
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: Colors.grey[600]),
          prefixIcon: Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(right: 15),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.grey[100]!.withOpacity(0.8),
          contentPadding: const EdgeInsets.symmetric(vertical: 18),
        ),
      ),
    );
  }

  Widget _buildEmergencySection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.red[50]!,
            Colors.red[50]!.withOpacity(0.5),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withOpacity(0.05),
            blurRadius: 20,
            spreadRadius: 2,
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.emergency_share_rounded, color: Colors.red[800]),
              const SizedBox(width: 10),
              Text(
                'Contacts d\'urgence',
                style: TextStyle(
                  color: Colors.red[800],
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildInputField(
            icon: Icons.contact_emergency_rounded,
            label: 'Contact 1',
            controller: _emergencyContact1Controller,
            color: Colors.orange[700]!,
          ),
          _buildInputField(
            icon: Icons.contact_emergency_rounded,
            label: 'Contact 2',
            controller: _emergencyContact2Controller,
            color: Colors.orange[700]!,
          ),
        ],
      ),
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.save_rounded, size: 24),
        label: isLoading
            ? const CircularProgressIndicator(color: Colors.white)
            : const Text('ENREGISTRER LES CHANGEMENTS'),
        onPressed: isLoading ? null : _saveInfo,
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
