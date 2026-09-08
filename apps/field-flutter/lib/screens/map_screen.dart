import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../widgets/map_view.dart';
import 'package:geolocator/geolocator.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  List<dynamic> _markers = [];
  bool _loading = true;
  Position? _currentPos;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      _currentPos = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.low)).catchError((_) => Future<Position>.error(_));
      final res = await context.read<ApiClient>().call('/v1/occurrences/map');
      if (mounted) {
        setState(() {
          _markers = res['records'] ?? [];
        });
      }
    } catch (e) {
      // Ignore
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mapa das Ordens')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : CustomMapView(markers: _markers, currentPosition: _currentPos),
      floatingActionButton: FloatingActionButton(
        onPressed: _load,
        child: const Icon(Icons.my_location),
      ),
    );
  }
}
