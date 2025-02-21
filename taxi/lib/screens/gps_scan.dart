import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

class GpsScanScreen extends StatefulWidget {
  const GpsScanScreen({super.key});

  @override
  State<GpsScanScreen> createState() => _GpsScanScreenState();
}

class _GpsScanScreenState extends State<GpsScanScreen> {
  final MapController _mapController = MapController();
  LatLng? _currentPosition;
  String? _locationError;
  bool _isLoading = true;

  final LatLng _initialCenter = const LatLng(48.8566, 2.3522);
  final double _initialZoom = 13.0;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    setState(() => _isLoading = true);
    try {
      // Vérifier si le service de localisation est activé
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'Service de localisation désactivé';
      }
      // Vérifier et demander la permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw 'Permission refusée';
        }
      }
      if (permission == LocationPermission.deniedForever) {
        throw 'Permission définitivement refusée';
      }
      // Récupérer la position
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );
      setState(() {
        _currentPosition = LatLng(pos.latitude, pos.longitude);
        _locationError = null;
      });
      // Déplacer la caméra après le rendu du widget
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_currentPosition != null) {
          _mapController.move(_currentPosition!, 15);
        }
      });
    } catch (e) {
      setState(() => _locationError = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else if (_locationError != null)
            _ErrorWidget(
              error: _locationError!,
              onRetry: _initLocation,
            )
          else
            _buildMap(),
          if (!_isLoading && _locationError == null)
            Positioned(
              bottom: 20,
              right: 20,
              child: FloatingActionButton(
                onPressed: _initLocation,
                child: const Icon(Icons.my_location),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMap() {
    return FlutterMap(
      mapController: _mapController,
      // Pour votre version, utilisez initialCenter et initialZoom
      options: MapOptions(
        initialCenter: _currentPosition ?? _initialCenter,
        initialZoom: _initialZoom,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: const ['a', 'b', 'c'],
        ),
        if (_currentPosition != null)
          MarkerLayer(
            markers: [
              Marker(
                width: 40,
                height: 40,
                point: _currentPosition!,
                // Utiliser 'child' plutôt que 'builder'
                child: const Icon(
                  Icons.location_pin,
                  color: Colors.red,
                  size: 40,
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class _ErrorWidget extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  const _ErrorWidget({
    required this.error,
    required this.onRetry,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              error,
              style: const TextStyle(color: Colors.red, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
