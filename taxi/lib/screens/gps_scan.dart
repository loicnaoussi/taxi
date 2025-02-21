import 'dart:async';
import 'dart:convert';
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
  LatLng? _destination;
  String? _locationError;
  bool _isLoading = true;

  final LatLng _initialCenter = const LatLng(48.8566, 2.3522);
  final double _initialZoom = 13.0;
  double _currentZoom = 13.0;

  // Liste des marqueurs pour les chauffeurs (récupérés depuis le backend)
  List<Marker> _driverMarkers = [];
  // Points pour afficher l’itinéraire (polyline)
  List<LatLng> _routePoints = [];

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    setState(() => _isLoading = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'Service de localisation désactivé';
      }
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
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.best),
      );
      setState(() {
        _currentPosition = LatLng(pos.latitude, pos.longitude);
        _locationError = null;
      });
      // Une fois le widget rendu, déplacer la caméra et récupérer les chauffeurs
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_currentPosition != null) {
          _mapController.move(_currentPosition!, _currentZoom);
          _fetchAvailableDrivers();
        }
      });
    } catch (e) {
      setState(() => _locationError = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // Récupère les positions des chauffeurs depuis le backend (à adapter selon votre API)
  Future<void> _fetchAvailableDrivers() async {
    if (_currentPosition == null) return;
    try {
      final response = await Dio().get(
        "http://192.168.1.158:5000/api/drivers/locations",
        options: Options(validateStatus: (status) => status! < 500),
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
      } else {
        setState(() => _driverMarkers = []);
        print("Aucun chauffeur trouvé, code: ${response.statusCode}");
      }
    } catch (e) {
      print("Erreur lors de la récupération des chauffeurs: $e");
    }
  }

  // Recherche de destination via l'API Nominatim
  Future<LatLng?> _searchDestination(String query) async {
    try {
      final response = await Dio().get(
        "https://nominatim.openstreetmap.org/search",
        queryParameters: {"q": query, "format": "json", "limit": 1},
        options: Options(headers: {"User-Agent": "flutter_map_app"}),
      );
      if (response.statusCode == 200 && response.data is List && response.data.isNotEmpty) {
        final result = response.data[0];
        double lat = double.parse(result["lat"]);
        double lon = double.parse(result["lon"]);
        return LatLng(lat, lon);
      }
    } catch (e) {
      print("Erreur lors de la recherche de destination: $e");
    }
    return null;
  }

  // Calculer l'itinéraire en utilisant l'API OSRM (route la plus courte)
  Future<void> _calculateRoute(LatLng destination) async {
    if (_currentPosition == null) return;
    try {
      final response = await Dio().get(
        "http://router.project-osrm.org/route/v1/driving/${_currentPosition!.longitude},${_currentPosition!.latitude};${destination.longitude},${destination.latitude}",
        queryParameters: {"overview": "full", "geometries": "geojson"},
        options: Options(validateStatus: (status) => status! < 500),
      );
      if (response.statusCode == 200) {
        List polyline = response.data["routes"][0]["geometry"]["coordinates"];
        List<LatLng> routePoints = polyline.map<LatLng>((pt) => LatLng(pt[1], pt[0])).toList();
        setState(() {
          _routePoints = routePoints;
        });
        // Déplacer la carte sur la destination
        _mapController.move(destination, _currentZoom);
      }
    } catch (e) {
      print("Erreur lors du calcul de l'itinéraire: $e");
    }
  }

  // Lorsque l'utilisateur soumet une recherche de destination via la barre de recherche
  Future<void> _onSearchSubmitted(String query) async {
    LatLng? destination = await _searchDestination(query);
    if (destination != null) {
      setState(() {
        _destination = destination;
      });
      await _calculateRoute(destination);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Destination introuvable")),
      );
    }
  }

  // Permet à l'utilisateur de définir la destination en tapotant sur la carte
  void _onMapTap(TapPosition tapPosition, LatLng point) {
    setState(() {
      _destination = point;
      // On peut déclencher le calcul d'itinéraire dès la sélection
      _calculateRoute(point);
    });
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
          // Barre de recherche flottante pour saisir une destination
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 4,
                    offset: Offset(2, 2),
                  )
                ],
              ),
              child: TextField(
                onSubmitted: _onSearchSubmitted,
                decoration: InputDecoration(
                  hintText: "Rechercher une destination...",
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.search),
                    onPressed: () => _onSearchSubmitted(_searchController.text),
                  ),
                  border: InputBorder.none,
                ),
                controller: _searchController,
              ),
            ),
          ),
          // Bouton pour rafraîchir la position
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

  // Contrôleur pour la barre de recherche
  final TextEditingController _searchController = TextEditingController();

  Widget _buildMap() {
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _currentPosition ?? _initialCenter,
        initialZoom: _initialZoom,
        onTap: _onMapTap,
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
        // Marqueur pour la destination choisie
        if (_destination != null)
          MarkerLayer(
            markers: [
              Marker(
                width: 40,
                height: 40,
                point: _destination!,
                child: const Icon(
                  Icons.flag,
                  color: Colors.orange,
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
        // Affichage de l'itinéraire calculé (polyline)
        if (_routePoints.isNotEmpty)
          PolylineLayer(
            polylines: [
              Polyline(
                points: _routePoints,
                strokeWidth: 4,
                color: Colors.blue,
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
