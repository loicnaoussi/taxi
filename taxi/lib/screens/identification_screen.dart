import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/config.dart';
import 'package:taxi/themes/theme.dart';

class IdentificationScreen extends StatefulWidget {
  const IdentificationScreen({super.key});

  @override
  State<IdentificationScreen> createState() => _IdentificationScreenState();
}

class _IdentificationScreenState extends State<IdentificationScreen> {
  // Map to store file paths for each document type
  final Map<String, File?> _selectedFiles = {
    'photo': null,
    'video': null,
    'cni': null,
    'card': null,
  };

  // This function uses FilePicker to pick a file and stores the result.
  Future<void> _pickFile(String fileType) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: fileType == 'video' ? FileType.video : FileType.image,
      );
      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFiles[fileType] = File(result.files.single.path!);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Fichier pour $fileType sélectionné")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur lors du choix du fichier: $e")),
      );
    }
  }

  // Submits the verification documents to the backend.
  Future<void> _submitVerification() async {
    // Check that all files are selected.
    if (_selectedFiles.values.any((file) => file == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez uploader tous les documents')),
      );
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null || token.isEmpty) {
        throw "Utilisateur non authentifié.";
      }

      // Create a FormData object with all selected files.
      final formData = FormData.fromMap({
        "verification_video": await MultipartFile.fromFile(
          _selectedFiles['video']!.path,
          filename: _selectedFiles['video']!.path.split('/').last,
        ),
        "cni_front": await MultipartFile.fromFile(
          _selectedFiles['cni']!.path,
          filename: _selectedFiles['cni']!.path.split('/').last,
        ),
        "cni_back": await MultipartFile.fromFile(
          _selectedFiles['card']!.path,
          filename: _selectedFiles['card']!.path.split('/').last,
        ),
        // For the photo, you might choose to send it separately or include it if needed.
        "photo": await MultipartFile.fromFile(
          _selectedFiles['photo']!.path,
          filename: _selectedFiles['photo']!.path.split('/').last,
        ),
      });

      final response = await Dio().post(
        "${Config.baseUrl}/api/verifications/upload-verification",
        data: formData,
        options: Options(
          headers: {
            "Authorization": "Bearer $token",
            "Content-Type": "multipart/form-data",
          },
        ),
      );

      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Fichiers de vérification envoyés avec succès !")),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Erreur lors de l'envoi: ${response.data['message'] ?? ''}")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur: $e")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vérification Identité'),
        backgroundColor: AppTheme.primaryColor,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 30),
            _buildUploadCard(
              icon: Icons.camera_alt_rounded,
              title: "Photo d'identité",
              subtitle: "Format JPEG ou PNG",
              fileType: 'photo',
              color: Colors.blue,
            ),
            _buildUploadCard(
              icon: Icons.videocam_rounded,
              title: "Vidéo de vérification",
              subtitle: "Maximum 30 secondes",
              fileType: 'video',
              color: Colors.purple,
            ),
            _buildUploadCard(
              icon: Icons.credit_card_rounded,
              title: "Carte Nationale",
              subtitle: "CNI recto/verso",
              fileType: 'cni',
              color: Colors.orange,
            ),
            _buildUploadCard(
              icon: Icons.directions_car_rounded,
              title: "Carte Grise",
              subtitle: "Document officiel",
              fileType: 'card',
              color: Colors.green,
            ),
            const SizedBox(height: 40),
            _buildSubmitButton(),
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
          'Vérification de sécurité',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Veuillez fournir les documents suivants pour compléter votre vérification',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[600],
            height: 1.4,
          ),
        ),
      ],
    );
  }

  Widget _buildUploadCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String fileType,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        child: InkWell(
          borderRadius: BorderRadius.circular(15),
          onTap: () => _pickFile(fileType),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withOpacity(0.1), color.withOpacity(0.05)],
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
                    color: color.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 28),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        _selectedFiles[fileType]?.path.split('/').last ?? subtitle,
                        style: TextStyle(
                          fontSize: 14,
                          color: _selectedFiles[fileType] != null
                              ? Colors.grey[800]
                              : Colors.grey[600],
                          fontStyle: _selectedFiles[fileType] != null
                              ? FontStyle.italic
                              : FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _selectedFiles[fileType] != null
                      ? Icons.check_circle_rounded
                      : Icons.upload_rounded,
                  color: _selectedFiles[fileType] != null ? Colors.green : color,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.verified_rounded),
        label: const Text('SOUMETTRE LA VÉRIFICATION'),
        onPressed: _submitVerification,
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
