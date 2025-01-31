import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:qr_image_generator/qr_image_generator.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:ui';
import 'dart:typed_data';
import 'dart:math';


class QrCodeScreen extends StatefulWidget {
  const QrCodeScreen({super.key});

  @override
  State<QrCodeScreen> createState() => _QrCodeScreenState();
}

class _QrCodeScreenState extends State<QrCodeScreen> {
  String _qrCodeData = 'https://example.com/driver';
  final GlobalKey _repaintBoundaryKey = GlobalKey();

  void _generateQrCode() {
    setState(() {
      _qrCodeData = 'https://example.com/driver/${Random().nextInt(9999)}';
    });
  }

  void _downloadQrCode() async {
    // try {
    //   RenderRepaintBoundary boundary = _repaintBoundaryKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
    //   ui.Image image = await boundary.toImage(pixelRatio: 3.0);
    //   ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    //   if (byteData != null) {
    //     Uint8List pngBytes = byteData.buffer.asUint8List();
    //     final status = await Permission.storage.request();
    //     if (status.isGranted) {
    //       final result = await ImageGallerySaver.saveImage(pngBytes);
    //       print(result);
    //       ScaffoldMessenger.of(context).showSnackBar(
    //         const SnackBar(content: Text('QR Code saved to gallery')),
    //       );
    //     } else {
    //       ScaffoldMessenger.of(context).showSnackBar(
    //         const SnackBar(content: Text('Permission denied')),
    //       );
    //     }
    //   }
    // } catch (e) {
    //   ScaffoldMessenger.of(context).showSnackBar(
    //     SnackBar(content: Text('Error: $e')),
    //   );
    // }
  }

  Future<void> saveQRImage() async {
    FocusScope.of(context).unfocus();
    String? filePath = await FilePicker.platform.saveFile(
      fileName: 'demoQr.png',
      type: FileType.image,
    );
    if (filePath == null) {
      return;
    }

    final generator = QRGenerator();

    // await generator.generate(
    //   data: _qrCodeData,
    //   filePath: filePath,
    //   size: 200,
    //   padding: 2,
    //   foregroundColor: Colors.black.value,
    //   backgroundColor: Colors.white.value,
    //   errorCorrectionLevel: ErrorCorrectionLevel.medium,
    // );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('QR Code saved successfully')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Code'),
        backgroundColor: Colors.blue, // Utilisez la couleur de votre thème si nécessaire
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            RepaintBoundary(
              key: _repaintBoundaryKey,
            //   child: QrImage(
            //     data: _qrCodeData,
            //     version: QrVersions.auto,
            //     size: 200.0,
            //     backgroundColor: Colors.white,
            //   ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _generateQrCode,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                textStyle: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text('Generate QR Code'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _downloadQrCode,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                textStyle: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text('Download QR Code'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: saveQRImage,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                textStyle: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text('Save QR Code'),
            ),
          ],
        ),
      ),
    );
  }
}