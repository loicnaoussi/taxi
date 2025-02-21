import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/themes/theme.dart';

class EditInfoScreen extends StatefulWidget {
  const EditInfoScreen({super.key});

  @override
  State<EditInfoScreen> createState() => _EditInfoScreenState();
}

class _EditInfoScreenState extends State<EditInfoScreen> {
  // Controllers for basic profile information
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController    = TextEditingController();
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _phoneController    = TextEditingController();

  // Controllers for password change
  final TextEditingController _currentPasswordController = TextEditingController();
  final TextEditingController _newPasswordController     = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  File? _selectedImageFile;
  String? _profileImageUrl; // URL as stored in the backend
  bool isLoading = false;
  bool isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
  }

  // Load user profile info from backend
  Future<void> _loadUserInfo() async {
    try {
      final token = await _getToken();
      // Replace with your actual endpoint
      final response = await Dio().get(
        "http://votre-backend/api/users/profile",
        options: Options(headers: {"Authorization": "Bearer $token"}),
      );
      if (response.statusCode == 200) {
        final data = response.data["user"];
        setState(() {
          _usernameController.text = data["username"] ?? "";
          _emailController.text    = data["email"] ?? "";
          _fullNameController.text = data["full_name"] ?? "";
          _phoneController.text    = data["phone_number"] ?? "";
          _profileImageUrl         = data["profile_image_url"] ?? "";
        });
      }
    } catch (e) {
      debugPrint("Erreur lors du chargement du profil: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Erreur de connexion lors du chargement du profil.")),
      );
    }
  }

  // Retrieve token from SharedPreferences
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString("token");
  }

  // Pick a new profile image from camera or gallery
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
          content: Text("Erreur: ${e.toString()}"),
          backgroundColor: Colors.red[800],
        ),
      );
    }
  }

  // Show a bottom sheet to choose image source
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
            ),
          ],
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildSourceOption(
                icon: Icons.camera_alt,
                label: 'Prendre une photo',
                color: AppTheme.primaryColor,
                onTap: () => _pickImage(ImageSource.camera),
              ),
              _buildSourceOption(
                icon: Icons.photo_library,
                label: 'Galerie',
                color: Colors.blue,
                onTap: () => _pickImage(ImageSource.gallery),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  // Widget for image source option
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

  // Save the updated profile information
  Future<void> _saveInfo() async {
    setState(() => isSaving = true);
    try {
      final token = await _getToken();

      // 1) If a new profile image is selected, upload it
      if (_selectedImageFile != null) {
        final formData = FormData.fromMap({
          "profile_image": await MultipartFile.fromFile(
            _selectedImageFile!.path,
            filename: _selectedImageFile!.path.split('/').last,
          ),
        });
        await Dio().post(
          "http://votre-backend/api/users/upload-photo",
          data: formData,
          options: Options(headers: {
            "Authorization": "Bearer $token",
            "Content-Type": "multipart/form-data"
          }),
        );
      }

      // 2) If user wants to change their password, validate and update it
      if (_currentPasswordController.text.isNotEmpty ||
          _newPasswordController.text.isNotEmpty ||
          _confirmPasswordController.text.isNotEmpty) {
        if (_currentPasswordController.text.isEmpty ||
            _newPasswordController.text.isEmpty ||
            _confirmPasswordController.text.isEmpty) {
          throw "Veuillez remplir tous les champs de modification du mot de passe.";
        }
        if (_newPasswordController.text != _confirmPasswordController.text) {
          throw "Le nouveau mot de passe et sa confirmation ne correspondent pas.";
        }
        // Check current password
        final checkResp = await Dio().post(
          "http://votre-backend/api/auth/check-password",
          data: {"password": _currentPasswordController.text},
          options: Options(headers: {"Authorization": "Bearer $token"}),
        );
        if (checkResp.data["valid"] != true) {
          throw "Le mot de passe actuel est incorrect.";
        }
        // Update password via a dedicated endpoint
        await Dio().put(
          "http://votre-backend/api/auth/change-password",
          data: {"new_password": _newPasswordController.text},
          options: Options(headers: {"Authorization": "Bearer $token"}),
        );
      }

      // 3) Update basic user information (username, email, full name, phone number)
      final updateData = {
        "username": _usernameController.text.trim(),
        "email": _emailController.text.trim(),
        "full_name": _fullNameController.text.trim(),
        "phone_number": _phoneController.text.trim(),
      };
      await Dio().put(
        "http://votre-backend/api/auth/update",
        data: updateData,
        options: Options(headers: {"Authorization": "Bearer $token"}),
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Text("Modifications sauvegardées", style: TextStyle(color: Colors.white)),
            ],
          ),
          backgroundColor: Colors.green[700],
        ),
      );
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
    _usernameController.dispose();
    _emailController.dispose();
    _fullNameController.dispose();
    _phoneController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // AppBar without a back arrow
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.primaryColor,
        elevation: 0,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
        ),
        title: const Text(
          "Modifier le profil",
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildProfileSection(),
            const SizedBox(height: 30),
            _buildInputSection(),
            const SizedBox(height: 30),
            _buildPasswordSection(),
            const SizedBox(height: 30),
            _buildSaveButton(),
          ],
        ),
      ),
    );
  }

  // Display the profile photo from backend (or a default if none)
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
                        : (_profileImageUrl != null && _profileImageUrl!.isNotEmpty
                            ? Image.network(_profileImageUrl!, fit: BoxFit.cover)
                            : Icon(
                                Icons.person,
                                size: 50,
                                color: Colors.grey[500],
                              )),
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
                Icons.edit,
                size: 20,
                color: Colors.white,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          "Changer la photo de profil",
          style: TextStyle(
            color: AppTheme.primaryColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  // Build input fields for username, email, full name, and phone number.
  // The fields are prefilled with the values from the backend.
  Widget _buildInputSection() {
    return Column(
      children: [
        _buildInputField(
          icon: Icons.person_outline,
          label: "Nom d'utilisateur",
          controller: _usernameController,
          color: Colors.blue,
        ),
        _buildInputField(
          icon: Icons.email,
          label: "Email",
          controller: _emailController,
          color: Colors.deepOrange,
        ),
        _buildInputField(
          icon: Icons.person,
          label: "Nom complet",
          controller: _fullNameController,
          color: Colors.blueAccent,
        ),
        _buildInputField(
          icon: Icons.phone,
          label: "Numéro de téléphone",
          controller: _phoneController,
          color: Colors.green,
        ),
      ],
    );
  }

  // Build the password change section. The user must enter their current password,
  // new password, and confirm the new password.
  Widget _buildPasswordSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Modifier le mot de passe",
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 10),
        _buildInputField(
          icon: Icons.lock_outline,
          label: "Mot de passe actuel",
          controller: _currentPasswordController,
          color: Colors.red,
        ),
        _buildInputField(
          icon: Icons.lock_open,
          label: "Nouveau mot de passe",
          controller: _newPasswordController,
          color: Colors.red,
        ),
        _buildInputField(
          icon: Icons.lock,
          label: "Confirmer le nouveau mot de passe",
          controller: _confirmPasswordController,
          color: Colors.red,
        ),
      ],
    );
  }

  // Generic widget for an input field
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

  // Save button widget
  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.save, size: 24),
        label: isSaving
            ? const CircularProgressIndicator(color: Colors.white)
            : const Text("ENREGISTRER LES CHANGEMENTS"),
        onPressed: isSaving ? null : _saveInfo,
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
