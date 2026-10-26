import 'dart:convert';

class KrBackupData {
  const KrBackupData({
    required this.clients,
    required this.products,
    required this.reminders,
    required this.scripts,
  });

  final List<Map<String, dynamic>> clients;
  final List<Map<String, dynamic>> products;
  final List<Map<String, dynamic>> reminders;
  final List<Map<String, dynamic>> scripts;

  static KrBackupData parse(String source) {
    if (source.length > 5 * 1024 * 1024) {
      throw const FormatException('O arquivo excede o limite de 5 MB.');
    }

    final decoded = jsonDecode(source);
    if (decoded is! Map) {
      throw const FormatException('O conteúdo não é um backup KR Easy válido.');
    }
    final root = Map<String, dynamic>.from(decoded);
    final format = root['format'];
    final version = root['version'];
    if (format != null && format != 'kr_easy_extension_backup') {
      throw const FormatException('Este arquivo não foi criado pelo KR Easy Extension.');
    }
    if (version is num && version > 1) {
      throw const FormatException('Este backup foi criado por uma versão mais recente do aplicativo.');
    }

    final clients = _records(root, 'clients', _client);
    final products = _records(root, 'products', _product);
    final reminders = _records(root, 'reminders', _reminder);
    final scripts = _records(root, 'scripts', _script);
    if (clients.isEmpty && products.isEmpty && reminders.isEmpty && scripts.isEmpty) {
      throw const FormatException('O backup não contém dados comerciais para importar.');
    }
    return KrBackupData(clients: clients, products: products, reminders: reminders, scripts: scripts);
  }

  static List<Map<String, dynamic>> _records(
    Map<String, dynamic> root,
    String key,
    Map<String, dynamic> Function(Map<String, dynamic>) normalize,
  ) {
    final value = root[key];
    if (value == null) return [];
    if (value is! List || value.length > 20000) {
      throw FormatException('A lista "$key" está inválida ou é grande demais.');
    }
    try {
      return value.map((entry) {
        if (entry is! Map) throw const FormatException('Registro inválido.');
        return normalize(Map<String, dynamic>.from(entry));
      }).toList();
    } on FormatException {
      rethrow;
    } catch (_) {
      throw FormatException('Há dados inválidos na lista "$key".');
    }
  }

  static Map<String, dynamic> _client(Map<String, dynamic> item) {
    final name = _requiredText(item, 'name', 'cliente');
    final stage = _text(item['stage'], 'Novo');
    const stages = {'Novo', 'Contato', 'Negociação', 'Venda'};
    if (!stages.contains(stage)) throw const FormatException('Etapa de cliente inválida.');
    return {
      'name': name,
      'note': _text(item['note'], ''),
      'stage': stage,
      'value': _number(item['value']),
      'updated': _text(item['updated'], ''),
    };
  }

  static Map<String, dynamic> _product(Map<String, dynamic> item) => {
        'name': _requiredText(item, 'name', 'produto'),
        'description': _text(item['description'], ''),
        'price': _text(item['price'], ''),
      };

  static Map<String, dynamic> _reminder(Map<String, dynamic> item) {
    final title = _requiredText(item, 'title', 'lembrete');
    final scheduledAt = _text(item['scheduledAt'], '');
    final date = _text(item['date'], '');
    if (DateTime.tryParse(scheduledAt) == null && date.isEmpty) {
      throw const FormatException('Um lembrete está sem data válida.');
    }
    return {
      'title': title,
      if (scheduledAt.isNotEmpty) 'scheduledAt': scheduledAt,
      if (date.isNotEmpty) 'date': date,
      'done': item['done'] == true,
    };
  }

  static Map<String, dynamic> _script(Map<String, dynamic> item) => {
        'title': _requiredText(item, 'title', 'script'),
        'category': _text(item['category'], 'Personalizado'),
        'text': _requiredText(item, 'text', 'script'),
        'favorite': item['favorite'] == true,
      };

  static String _requiredText(Map<String, dynamic> item, String key, String kind) {
    final value = item[key];
    if (value is! String || value.trim().isEmpty || value.length > 10000) {
      throw FormatException('Nome ou conteúdo de $kind inválido.');
    }
    return value.trim();
  }

  static String _text(Object? value, String fallback) => value is String ? value.trim() : fallback;

  static double _number(Object? value) {
    if (value is num && value.isFinite) return value.toDouble();
    if (value is String) return double.tryParse(value.replaceAll(',', '.')) ?? 0;
    return 0;
  }

  static List<Map<String, dynamic>> merge({
    required List<Map<String, dynamic>> existing,
    required List<Map<String, dynamic>> incoming,
    required String Function(Map<String, dynamic>) identity,
  }) {
    final result = existing.map((item) => Map<String, dynamic>.from(item)).toList();
    final known = result.map(identity).toSet();
    for (final item in incoming) {
      if (known.add(identity(item))) result.add(Map<String, dynamic>.from(item));
    }
    return result;
  }
}
