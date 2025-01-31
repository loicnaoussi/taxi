import 'package:flutter/material.dart';
import 'package:taxi/themes/theme.dart';

class IdentificationScreen extends StatefulWidget {
  const IdentificationScreen({super.key});

  @override
  State<IdentificationScreen> createState() => _IdentificationScreenState();
}

class _IdentificationScreenState extends State<IdentificationScreen> {
  final Map<String, String?> _uploads = {
    'photo': null,
    'video': null,
    'cni': null,
    'card': null,
  };

  void _submitVerification() {
    if (_uploads.values.any((v) => v == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez uploader tous les documents')),
      );
      return;
    }
    // Implémenter la soumission
  }

  Future<void> _pickFile(String fileType) async {
    // Implémenter le sélecteur de fichier
    setState(() {
      _uploads[fileType] = 'fichier_selectionné.${fileType == 'video' ? 'mp4' : 'jpg'}';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vérification Identité'),
        backgroundColor: AppTheme.primaryColor,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            bottom: Radius.circular(20),
          ),
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
                        _uploads[fileType] ?? subtitle,
                        style: TextStyle(
                          fontSize: 14,
                          color: _uploads[fileType] != null 
                             ? Colors.grey[800] 
                             : Colors.grey[600],
                          fontStyle: _uploads[fileType] != null 
                             ? FontStyle.italic 
                             : FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _uploads[fileType] != null 
                     ? Icons.check_circle_rounded 
                     : Icons.upload_rounded,
                  color: _uploads[fileType] != null ? Colors.green : color,
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