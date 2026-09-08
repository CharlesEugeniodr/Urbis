import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../core/api_client.dart';
import '../widgets/status_stepper.dart';

class WorkOrderDetailScreen extends StatefulWidget {
  final Map<String, dynamic> order;

  const WorkOrderDetailScreen({super.key, required this.order});

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  late Map<String, dynamic> _order;
  bool _loading = false;
  String? _routeInfo;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
  }

  Future<Position> _locate() async {
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
    if (p == LocationPermission.denied || p == LocationPermission.deniedForever) throw Exception('Permissão negada');
    return Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _loading = true);
    try {
      Position? p;
      if (['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].contains(status)) {
        p = await _locate();
      }
      final api = context.read<ApiClient>();
      final res = await api.call('/v1/field/work-orders/${_order['id']}/status', method: 'POST', body: {
        'status': status,
        if (p != null) 'latitude': p.latitude,
        if (p != null) 'longitude': p.longitude,
      });
      setState(() {
        _order = res['workOrder'] ?? _order;
        _order['status'] = status;
      });
      
      if (status == 'EN_ROUTE') {
        p = await _locate();
        final routeRes = await api.call('/v1/field/work-orders/${_order['id']}/route?lat=${p.latitude}&lon=${p.longitude}');
        setState(() {
          _routeInfo = 'Distância: ${routeRes['distanceM']} m, Tempo: ${routeRes['durationS']} s';
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _takePhoto(String purpose) async {
    try {
      final p = await _locate();
      final f = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80);
      if (f == null) return;
      final bytes = await f.readAsBytes();
      
      setState(() => _loading = true);
      await context.read<ApiClient>().call('/v1/occurrences/${_order['occurrenceId']}/evidence', method: 'POST', body: {
        'filename': f.name,
        'mediaType': f.mimeType ?? 'image/jpeg',
        'dataBase64': base64Encode(bytes),
        'purpose': purpose,
        'capturedAt': DateTime.now().toUtc().toIso8601String(),
        'latitude': p.latitude,
        'longitude': p.longitude,
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto enviada com sucesso.')));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final occurrence = _order['occurrence'] ?? {};
    final status = _order['status'] ?? 'PENDING';

    return Scaffold(
      appBar: AppBar(title: Text('OS ${_order['id']}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Categoria: ${occurrence['categoryCode']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Text('Endereço: ${occurrence['address']}'),
                          const SizedBox(height: 8),
                          Text('Descrição: ${occurrence['description']}'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  StatusStepper(currentStatus: status),
                  const SizedBox(height: 16),
                  if (_routeInfo != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(_routeInfo!, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  if (status == 'PENDING')
                    FilledButton(onPressed: () => _updateStatus('EN_ROUTE'), child: const Text('Iniciar Rota')),
                  if (status == 'EN_ROUTE')
                    FilledButton(onPressed: () => _updateStatus('ARRIVED'), child: const Text('Cheguei')),
                  if (status == 'ARRIVED') ...[
                    OutlinedButton.icon(onPressed: () => _takePhoto('BEFORE'), icon: const Icon(Icons.camera_alt), label: const Text('Foto Antes')),
                    const SizedBox(height: 8),
                    FilledButton(onPressed: () => _updateStatus('IN_PROGRESS'), child: const Text('Iniciar Serviço')),
                  ],
                  if (status == 'IN_PROGRESS') ...[
                    OutlinedButton.icon(onPressed: () => _takePhoto('AFTER'), icon: const Icon(Icons.camera_alt), label: const Text('Foto Depois')),
                    const SizedBox(height: 8),
                    FilledButton(onPressed: () => _updateStatus('COMPLETED'), child: const Text('Concluir')),
                  ],
                  if (status == 'COMPLETED')
                    const Center(child: Text('Serviço Concluído', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold))),
                ],
              ),
            ),
    );
  }
}
