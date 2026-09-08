import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../widgets/category_selector.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class NewOccurrenceScreen extends StatefulWidget {
  const NewOccurrenceScreen({super.key});

  @override
  State<NewOccurrenceScreen> createState() => _NewOccurrenceScreenState();
}

class _NewOccurrenceScreenState extends State<NewOccurrenceScreen> {
  String? _selectedCategory;
  final _desc = TextEditingController();
  bool _isLoading = false;
  final LatLng _currentLocation = const LatLng(-23.5505, -46.6333); // Mock for now

  Future<void> _submit() async {
    if (_selectedCategory == null || _desc.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Preencha todos os campos')));
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await context.read<ApiClient>().post('/v1/occurrences', {
        'categoryCode': _selectedCategory,
        'description': _desc.text,
        'latitude': _currentLocation.latitude,
        'longitude': _currentLocation.longitude,
        'gpsAccuracyM': 10.0,
      });
      if (mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Sucesso'),
            content: Text('Protocolo: ${res['occurrence']['id']}'),
            actions: [
              TextButton(onPressed: () {
                Navigator.pop(context);
                setState(() { _selectedCategory = null; _desc.clear(); });
              }, child: const Text('OK'))
            ]
          )
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Selecione a Categoria', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          CategorySelector(
            selected: _selectedCategory,
            onSelect: (c) => setState(() => _selectedCategory = c),
          ),
          const SizedBox(height: 16),
          TextField(controller: _desc, decoration: const InputDecoration(labelText: 'DescriÃ§Ã£o'), maxLines: 3),
          const SizedBox(height: 16),
          Container(
            height: 150,
            decoration: BoxDecoration(border: Border.all(color: Colors.grey)),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: _currentLocation,
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
                      point: _currentLocation,
                      width: 80,
                      height: 80,
                      child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _isLoading ? null : _submit,
              icon: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Icon(Icons.send),
              label: const Text('Registrar OcorrÃªncia'),
            ),
          ),
        ],
      ),
    );
  }
}
