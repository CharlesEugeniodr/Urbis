import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class MapViewWidget extends StatelessWidget {
  final LatLng initialCenter;
  
  const MapViewWidget({super.key, required this.initialCenter});

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      options: MapOptions(
        initialCenter: initialCenter,
        initialZoom: 15.0,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.urbis.citizen',
        ),
        MarkerLayer(
          markers: [
            Marker(
              point: initialCenter,
              width: 80,
              height: 80,
              child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
            ),
          ],
        ),
      ],
    );
  }
}
