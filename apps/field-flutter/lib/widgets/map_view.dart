import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../core/theme.dart';
import 'package:geolocator/geolocator.dart';

class CustomMapView extends StatelessWidget {
  final List<dynamic> markers;
  final Position? currentPosition;

  const CustomMapView({super.key, required this.markers, this.currentPosition});

  @override
  Widget build(BuildContext context) {
    final center = currentPosition != null 
        ? LatLng(currentPosition!.latitude, currentPosition!.longitude)
        : const LatLng(-23.55052, -46.633309);

    return FlutterMap(
      options: MapOptions(
        initialCenter: center,
        initialZoom: 13,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.urbis_field',
        ),
        MarkerLayer(
          markers: markers.map((m) {
            final lat = (m['latitude'] as num).toDouble();
            final lng = (m['longitude'] as num).toDouble();
            final status = m['status'] ?? 'PENDING';
            return Marker(
              point: LatLng(lat, lng),
              width: 40,
              height: 40,
              child: Icon(Icons.location_on, color: AppTheme.getStatusColor(status), size: 40),
            );
          }).toList(),
        ),
        if (currentPosition != null)
          MarkerLayer(
            markers: [
              Marker(
                point: LatLng(currentPosition!.latitude, currentPosition!.longitude),
                child: const Icon(Icons.my_location, color: Colors.blue, size: 24),
              ),
            ],
          ),
      ],
    );
  }
}
