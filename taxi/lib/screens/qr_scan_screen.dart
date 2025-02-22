import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:taxi/config.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final GlobalKey _qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? _controller;
  StreamSubscription? _qrSubscription;
  String? _scanResult;

  @override
  void reassemble() {
    super.reassemble();
    if (Platform.isAndroid) {
      _controller?.pauseCamera();
    }
    _controller?.resumeCamera();
  }

  // Called when the QRView is created.
  void _onQRViewCreated(QRViewController controller) {
    _controller = controller;
    _qrSubscription = controller.scannedDataStream.listen((scanData) async {
      if (!mounted) return;
      // Only process the first scanned result.
      if (_scanResult != null) return;
      
      setState(() {
        _scanResult = scanData.code;
      });
      // Stop the camera once a QR code is scanned.
      await controller.pauseCamera();
      
      // Validate the scanned QR code via the backend.
      await _validateQrCode(_scanResult);
      
      // Note: We do NOT automatically pop the screen here.
      // The user may close the scanner manually.
    });
  }

  // Validates the scanned QR code with the backend.
  Future<void> _validateQrCode(String? qrCode) async {
    if (qrCode == null || qrCode.isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? "";
      final dio = Dio();
      final response = await dio.post(
        "${Config.baseUrl}/api/qrcodes/validate",
        data: {"qr_code": qrCode},
        options: Options(
          headers: {"Authorization": "Bearer $token"},
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      if (response.statusCode == 200) {
        // QR Code is valid; extract driver info.
        final driverInfo = response.data;
        _showDriverInfoDialog(driverInfo);
      } else if (response.statusCode == 404) {
        _showErrorDialog("Le chauffeur n'est pas reconnu.");
      } else {
        _showErrorDialog("Erreur lors de la validation du QR Code.");
      }
    } catch (e) {
      _showErrorDialog("Erreur réseau: ${e.toString()}");
    }
  }

  // Display a dialog with driver information.
  void _showDriverInfoDialog(dynamic driverInfo) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Informations du Chauffeur"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text("Nom: ${driverInfo['full_name'] ?? 'Non défini'}"),
            Text("Téléphone: ${driverInfo['phone_number'] ?? 'Non défini'}"),
            // Add more fields as needed.
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("OK"),
          ),
        ],
      ),
    );
  }

  // Display an error dialog.
  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Erreur"),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("OK"),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _qrSubscription?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scanner un QR Code'),
        backgroundColor: Colors.blue.shade800,
      ),
      body: Stack(
        children: [
          QRView(
            key: _qrKey,
            onQRViewCreated: _onQRViewCreated,
            overlay: QrScannerOverlayShape(
              borderColor: Colors.cyan,
              borderWidth: 10,
              borderLength: 40,
              cutOutSize: 250,
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                color: Colors.black54,
                child: const Text(
                  'Pointez la caméra vers un code QR.',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
