import 'dart:async';
import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/rendering.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/config.dart';
import 'package:taxi/themes/theme.dart';

class QrCodeScreen extends StatefulWidget {
  const QrCodeScreen({super.key});

  @override
  State<QrCodeScreen> createState() => _QrCodeScreenState();
}

class _QrCodeScreenState extends State<QrCodeScreen> {
  String _qrCodeData = 'Chargement...';
  final GlobalKey _repaintBoundaryKey = GlobalKey();
  final Random _random = Random();
  bool isLoadingQr = true;

  @override
  void initState() {
    super.initState();
    _fetchQrCode();
  }

  // Retrieve the stored QR Code from the backend without auto-generating a new one.
  Future<void> _fetchQrCode() async {
    setState(() {
      isLoadingQr = true;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? "";
      final dio = Dio();
      final response = await dio.get(
        "${Config.baseUrl}/api/qrcodes/my-qrcode",
        options: Options(
          headers: {"Authorization": "Bearer $token"},
          validateStatus: (status) => status! < 500,
        ),
      );
      if (response.statusCode == 200 && response.data["qr_code"] != null) {
        setState(() {
          _qrCodeData = response.data["qr_code"];
        });
      } else {
        // No QR code found; display message and do not auto-generate.
        setState(() {
          _qrCodeData = "Aucun QR Code";
        });
      }
    } catch (e) {
      setState(() {
        _qrCodeData = "Erreur lors du chargement";
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur de chargement: ${e.toString()}")),
      );
    } finally {
      setState(() {
        isLoadingQr = false;
      });
    }
  }

  // Show a confirmation dialog, then generate and store a new QR Code if confirmed.
  Future<void> _confirmAndGenerateQrCode() async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Générer un nouveau QR Code"),
        content: const Text(
            "Êtes-vous sûr de vouloir générer un nouveau QR Code ? Cela remplacera l'ancien."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Confirmer"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _generateAndStoreQrCode();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Nouveau QR Code généré avec succès")),
      );
    }
  }

  // Generates a new random QR Code and sends it to the backend for updating.
  Future<void> _generateAndStoreQrCode() async {
    setState(() {
      isLoadingQr = true;
    });
    try {
      final newCode = 'QR${_random.nextInt(900000) + 100000}'; // 6-digit code
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? "";
      final dio = Dio();
      final response = await dio.post(
        "${Config.baseUrl}/api/qrcodes/update",
        data: {"qr_code": newCode},
        options: Options(
          headers: {"Authorization": "Bearer $token"},
          validateStatus: (status) => status! < 500,
        ),
      );
      if (response.statusCode == 200) {
        setState(() {
          _qrCodeData = newCode;
        });
      } else {
        throw "Erreur lors de la mise à jour du QR Code";
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur: ${e.toString()}")),
      );
    } finally {
      setState(() {
        isLoadingQr = false;
      });
    }
  }

  Future<void> _downloadQrCode() async {
    try {
      final boundary = _repaintBoundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return;

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ImageByteFormat.png);
      final pngBytes = byteData?.buffer.asUint8List();
      if (pngBytes == null) return;

      final status = await Permission.storage.request();
      if (!status.isGranted) return;

      final result = await ImageGallerySaver.saveImage(pngBytes);
      if (result['isSuccess']) {
        _showSnackBar('QR Code saved to gallery');
      }
    } catch (e) {
      _showSnackBar('Error: ${e.toString()}');
    }
  }

  Future<void> _saveQRImage() async {
    try {
      final filePath = await FilePicker.platform.saveFile(
        fileName: 'qr_code_${_random.nextInt(10000)}.png',
        type: FileType.image,
      );
      if (filePath == null) return;

      final boundary = _repaintBoundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return;

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ImageByteFormat.png);
      final pngBytes = byteData?.buffer.asUint8List();
      if (pngBytes == null) return;

      await ImageGallerySaver.saveImage(pngBytes, name: filePath);
      _showSnackBar('QR Code saved successfully');
    } catch (e) {
      _showSnackBar('Error: ${e.toString()}');
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.blue.shade800,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'QR Code Generator',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.blue.shade800, Colors.blue.shade600],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.blue.shade50, Colors.white],
          ),
        ),
        child: Center(
          child: isLoadingQr
              ? const CircularProgressIndicator()
              : SingleChildScrollView(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      _buildQrCodeContainer(),
                      const SizedBox(height: 30),
                      _buildActionButtons(),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildQrCodeContainer() {
    return RepaintBoundary(
      key: _repaintBoundaryKey,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.blue.shade100,
              blurRadius: 15,
              spreadRadius: 2,
            ),
          ],
        ),
        child: QrImageView(
          data: _qrCodeData,
          version: QrVersions.auto,
          // Note: The QrImageView widget from qr_flutter package does not accept a 'size' parameter.
          // Instead, wrap it in a SizedBox to control its dimensions.
          // For example:
          // child: SizedBox(width: 220, height: 220, child: QrImage(...))
          // Here we use a SizedBox:
          // Alternatively, if your version supports 'size', you may use it.
          // We'll wrap with SizedBox:
          embeddedImage: const AssetImage('assets/images/logo.png'),
          embeddedImageStyle: QrEmbeddedImageStyle(
            size: const Size(40, 40),
            color: Colors.blue.shade800,
          ),
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          _buildGradientButton(
            text: 'Generate New QR',
            icon: Icons.autorenew_rounded,
            onPressed: _confirmAndGenerateQrCode,
          ),
          const SizedBox(height: 15),
          _buildGradientButton(
            text: 'Save to Gallery',
            icon: Icons.download_rounded,
            onPressed: _downloadQrCode,
          ),
          const SizedBox(height: 15),
          _buildGradientButton(
            text: 'Export as File',
            icon: Icons.save_alt_rounded,
            onPressed: _saveQRImage,
          ),
        ],
      ),
    );
  }

  Widget _buildGradientButton({
    required String text,
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          colors: [Colors.blue.shade700, Colors.blue.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.shade200,
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: Colors.white),
                const SizedBox(width: 12),
                Text(
                  text,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
