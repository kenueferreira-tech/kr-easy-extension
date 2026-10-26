import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:kr_easy_extension/backup.dart';

void main() {
  test('parses and normalizes an exported KR Easy backup', () {
    final backup = KrBackupData.parse(jsonEncode({
      'format': 'kr_easy_extension_backup',
      'version': 1,
      'clients': [
        {'name': ' Marina ', 'stage': 'Negociação', 'value': '150,50'}
      ],
      'products': [
        {'name': 'Plano', 'description': 'Suporte', 'price': '49,99'}
      ],
      'reminders': [
        {'title': 'Retorno', 'scheduledAt': '2026-11-02T10:30:00.000', 'done': false, 'notificationId': 10}
      ],
      'scripts': [
        {'title': 'Abertura', 'category': 'Inicial', 'text': 'Olá!', 'favorite': true}
      ],
      'license': 'must-not-be-imported',
    }));

    expect(backup.clients.single['name'], 'Marina');
    expect(backup.clients.single['value'], 150.5);
    expect(backup.reminders.single.containsKey('notificationId'), isFalse);
    expect(backup.scripts.single['favorite'], isTrue);
  });

  test('accepts legacy backups and rejects malformed or unsupported formats', () {
    expect(KrBackupData.parse(jsonEncode({'clients': [], 'products': [], 'scripts': [{'title': 'x', 'text': 'y'}]})).scripts, hasLength(1));
    expect(() => KrBackupData.parse('not json'), throwsFormatException);
    expect(() => KrBackupData.parse(jsonEncode({'format': 'other', 'clients': [{'name': 'Ana'}]})), throwsFormatException);
    expect(() => KrBackupData.parse(jsonEncode({'version': 2, 'clients': [{'name': 'Ana'}]})), throwsFormatException);
  });

  test('merges records without replacing or duplicating existing data', () {
    final merged = KrBackupData.merge(
      existing: [{'name': 'Ana'}],
      incoming: [{'name': 'Ana'}, {'name': 'Bia'}],
      identity: (item) => '${item['name']}'.toLowerCase(),
    );

    expect(merged, [
      {'name': 'Ana'},
      {'name': 'Bia'},
    ]);
  });
}
