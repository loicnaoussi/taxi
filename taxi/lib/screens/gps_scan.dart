import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';

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

  // Liste des marqueurs pour les chauffeurs disponibles (récupérés depuis le backend)
  List<Marker> _driverMarkers = [];

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _initLocation() async {
    setState(() => _isLoading = true);
    try {
      // Vérifier que le service de localisation est activé
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
      // Récupérer la position actuelle
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );
      setState(() {
        _currentPosition = LatLng(pos.latitude, pos.longitude);
        _locationError = null;
      });
      // Déplacer la caméra après le rendu initial
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_currentPosition != null) {
          _mapController.move(_currentPosition!, 15);
          _fetchAvailableDrivers();
        }
      });
    } catch (e) {
      setState(() => _locationError = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // Récupère depuis le backend la liste des chauffeurs connectés
  Future<void> _fetchAvailableDrivers() async {
    if (_currentPosition == null) return;
    try {
      final response = await Dio().get(
        "http://192.168.1.158:5000/api/drivers/locations",
        options: Options(
          // Accepter les codes d'erreur clients (404) sans lancer d'exception
          validateStatus: (status) => status! < 500,
        ),
      );
      if (response.statusCode == 200) {
        List data = response.data;
        List<Marker> markers = data.map<Marker>((driver) {
          double lat = driver["latitude"];
          double lng = driver["longitude"];
          return Marker(
            width: 30,
            height: 30,
            point: LatLng(lat, lng),
            child: const Icon(
              Icons.directions_car,
              color: Colors.blue,
              size: 30,
            ),
          );
        }).toList();
        setState(() {
          _driverMarkers = markers;
        });
      } else if (response.statusCode == 404) {
        // Aucun chauffeur trouvé
        setState(() {
          _driverMarkers = [];
        });
        print("Aucun chauffeur trouvé.");
      } else {
        print("Erreur lors de la récupération des chauffeurs : Code ${response.statusCode}");
      }
    } catch (e) {
      print("Erreur lors de la récupération des chauffeurs: $e");
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
      options: MapOptions(
        // Utilisez initialCenter et initialZoom pour définir la vue initiale
        initialCenter: _currentPosition ?? _initialCenter,
        initialZoom: _initialZoom,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: const ['a', 'b', 'c'],
        ),
        // Marqueur pour la position de l'utilisateur
        if (_currentPosition != null)
          MarkerLayer(
            markers: [
              Marker(
                width: 40,
                height: 40,
                point: _currentPosition!,
                child: const Icon(
                  Icons.person_pin_circle,
                  color: Colors.green,
                  size: 40,
                ),
              ),
            ],
          ),
        // Marqueurs pour les chauffeurs disponibles
        if (_driverMarkers.isNotEmpty)
          MarkerLayer(
            markers: _driverMarkers,
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
