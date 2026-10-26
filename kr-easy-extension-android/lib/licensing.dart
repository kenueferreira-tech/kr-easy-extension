import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _deviceApi = 'https://kr-easy-extension.vercel.app/api/devices';
const _licenseKeyStore = 'kr_license_key';
const _deviceIdStore = 'kr_android_device_id';

class LicenseActivation {
  const LicenseActivation({required this.deviceId, required this.devices, required this.maxDevices});
  final String deviceId;
  final int devices;
  final int maxDevices;
}

class KrLicenseService {
  KrLicenseService(this.storage);
  final FlutterSecureStorage storage;

  Future<String?> getStoredKey() => storage.read(key: _licenseKeyStore);

  Future<String> _deviceId() async {
    final current = await storage.read(key: _deviceIdStore);
    if (current != null) return current;
    final random = Random.secure();
    final id = List<int>.generate(32, (_) => random.nextInt(256)).map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    await storage.write(key: _deviceIdStore, value: id);
    return id;
  }

  Future<LicenseActivation> activate(String input) async {
    final key = _normalize(input);
    if (!RegExp(r'^KREASY-[A-Z0-9-]{8,40}$').hasMatch(key)) {
      throw const LicenseException('Confira o formato da chave e tente novamente.');
    }
    final id = await _deviceId();
    final data = await _request({'action': 'register', 'key': key, 'deviceId': id, 'name': 'KR Easy Android', 'type': 'android'});
    await storage.write(key: _licenseKeyStore, value: key);
    return LicenseActivation(deviceId: id, devices: (data['devices'] as List? ?? const []).length, maxDevices: data['maxDevices'] as int? ?? 2);
  }

  Future<LicenseActivation> verify() async {
    final key = await getStoredKey();
    if (key == null) throw const LicenseException('Nenhuma chave está salva neste aparelho.');
    final id = await _deviceId();
    final data = await _request({'action': 'list', 'key': key});
    final devices = (data['devices'] as List? ?? const []).cast<Map>();
    final linked = devices.any((device) => device['id'] == id);
    if (!linked) throw const LicenseException('Esta chave não está vinculada a este aparelho.');
    return LicenseActivation(deviceId: id, devices: devices.length, maxDevices: data['maxDevices'] as int? ?? 2);
  }

  Future<void> deactivate() async {
    final key = await getStoredKey();
    if (key == null) return;
    final id = await _deviceId();
    await _request({'action': 'remove', 'key': key, 'deviceId': id});
    await storage.delete(key: _licenseKeyStore);
  }

  Future<Map<String, dynamic>> _request(Map<String, dynamic> body) async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(Uri.parse(_deviceApi)).timeout(const Duration(seconds: 12));
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.write(jsonEncode(body));
      final response = await request.close().timeout(const Duration(seconds: 12));
      final responseBody = await response.transform(utf8.decoder).join().timeout(const Duration(seconds: 12));
      final decoded = jsonDecode(responseBody);
      final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
      if (response.statusCode < 200 || response.statusCode >= 300 || data['ok'] != true) {
        throw LicenseException(data['error'] as String? ?? 'O servidor não confirmou a licença.');
      }
      return data;
    } on LicenseException {
      rethrow;
    } on SocketException {
      throw const LicenseException('Não foi possível conectar ao serviço de licenças. Verifique a internet.');
    } on FormatException {
      throw const LicenseException('O serviço de licenças retornou uma resposta inválida.');
    } on TimeoutException {
      throw const LicenseException('A validação demorou mais que o esperado. Tente novamente.');
    } catch (error) {
      if (error.toString().contains('TimeoutException')) {
        throw const LicenseException('A validação demorou mais que o esperado. Tente novamente.');
      }
      rethrow;
    } finally {
      client.close(force: true);
    }
  }

  static String _normalize(String value) => value.trim().toUpperCase().replaceAll(RegExp(r'\s+'), '');
}

class LicenseException implements Exception {
  const LicenseException(this.message);
  final String message;
  @override
  String toString() => message;
}
