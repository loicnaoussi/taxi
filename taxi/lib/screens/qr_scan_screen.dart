import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';

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

  // Callback appelé quand le widget QRView est créé
  void _onQRViewCreated(QRViewController controller) {
    _controller = controller;
    _qrSubscription = controller.scannedDataStream.listen((scanData) {
      if (!mounted) return;
      setState(() {
        _scanResult = scanData.code;
      });
      // On arrête la caméra une fois le code scanné
      controller.pauseCamera();
      // Afficher le résultat via un SnackBar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Scanné: $_scanResult'),
          duration: const Duration(seconds: 3),
        ),
      );
      // Retour automatique après 2 secondes, si le widget est encore monté
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) Navigator.pop(context, _scanResult);
      });
    });
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
          // QRView pour la caméra
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
          // Texte explicatif en bas
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
