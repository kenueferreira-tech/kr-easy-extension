import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import 'finance.dart';

const _green = Color(0xFF35E879);
const _bg = Color(0xFF07110B);
const _panel = Color(0xFF101B14);

void main() => runApp(const KrEasyApp());

class KrEasyApp extends StatelessWidget {
  const KrEasyApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'KR Easy Extension',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: _bg,
          colorScheme: ColorScheme.fromSeed(seedColor: _green, brightness: Brightness.dark, surface: _panel),
          useMaterial3: true,
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: _panel,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
          ),
        ),
        home: const KrHome(),
      );
}

class KrHome extends StatefulWidget {
  const KrHome({super.key});
  @override
  State<KrHome> createState() => _KrHomeState();
}

class _KrHomeState extends State<KrHome> {
  int _tab = 0;
  String _tool = 'Ferramentas';
  bool _loading = true;
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _reminders = [];
  final List<Map<String, dynamic>> _scripts = [
    {'title': 'Apresentação inicial', 'category': 'Apresentação', 'text': 'Olá, [nome]! Tudo bem? Sou [seu nome]. Posso entender melhor o que você procura para apresentar uma opção adequada?', 'favorite': true},
    {'title': 'Entender a necessidade', 'category': 'Negociação', 'text': 'O que é mais importante para você ao escolher essa solução: praticidade, prazo ou investimento?', 'favorite': false},
    {'title': 'Objeção: vou pensar', 'category': 'Objeções', 'text': 'Claro, faz sentido avaliar com calma. Qual ponto você gostaria de analisar melhor? Posso esclarecer sem compromisso.', 'favorite': false},
    {'title': 'Acompanhamento', 'category': 'Retorno', 'text': 'Oi, [nome]! Passando para saber se conseguiu avaliar nossa conversa. Posso ajudar com alguma dúvida?', 'favorite': false},
    {'title': 'Pós-venda', 'category': 'Pós-venda', 'text': 'Olá, [nome]! Gostaria de confirmar se está tudo certo e se posso ajudar com mais alguma coisa.', 'favorite': false},
  ];
  final _search = TextEditingController();
  final _assistantInput = TextEditingController();
  final _academyAnswer = TextEditingController();
  String _assistantOutput = '';
  String _category = 'Todos';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    setState(() {
      _clients = _readList(p, 'clients');
      _products = _readList(p, 'products');
      _reminders = _readList(p, 'reminders');
      final stored = _readList(p, 'scripts');
      if (stored.isNotEmpty) { _scripts.clear(); _scripts.addAll(stored); }
      _loading = false;
    });
  }

  List<Map<String, dynamic>> _readList(SharedPreferences p, String key) {
    try { return (jsonDecode(p.getString(key) ?? '[]') as List).map((e) => Map<String, dynamic>.from(e as Map)).toList(); }
    catch (_) { return []; }
  }

  Future<void> _save() async {
    final p = await SharedPreferences.getInstance();
    await p.setString('clients', jsonEncode(_clients));
    await p.setString('products', jsonEncode(_products));
    await p.setString('reminders', jsonEncode(_reminders));
    await p.setString('scripts', jsonEncode(_scripts));
  }

  @override
  void dispose() { _search.dispose(); _assistantInput.dispose(); _academyAnswer.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final pages = [_dashboard(), _assistant(), _scriptsPage(), _clientsPage(), _morePage()];
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [const Icon(Icons.bolt, color: _green), const SizedBox(width: 8), Text(_tab == 4 ? _tool : ['Início', 'KR Copiloto', 'Scripts', 'Clientes', 'Mais'][_tab], style: const TextStyle(fontWeight: FontWeight.w700))]),
        actions: [if (_tab == 2) IconButton(tooltip: 'Novo script', onPressed: _addScript, icon: const Icon(Icons.add)), IconButton(tooltip: 'Ajuda e diagnóstico', onPressed: _help, icon: const Icon(Icons.help_outline))],
      ),
      body: _loading ? const Center(child: CircularProgressIndicator(color: _green)) : SafeArea(child: pages[_tab]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() { _tab = i; _tool = 'Ferramentas'; }),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.space_dashboard_outlined), selectedIcon: Icon(Icons.space_dashboard), label: 'Início'),
          NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Copiloto'),
          NavigationDestination(icon: Icon(Icons.forum_outlined), selectedIcon: Icon(Icons.forum), label: 'Scripts'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Clientes'),
          NavigationDestination(icon: Icon(Icons.apps_outlined), selectedIcon: Icon(Icons.apps), label: 'Mais'),
        ],
      ),
    );
  }

  Widget _dashboard() {
    final pending = _reminders.where((e) => e['done'] != true).length;
    final sales = _clients.where((e) => e['stage'] == 'Venda').length;
    return ListView(padding: const EdgeInsets.all(18), children: [
      _hero('Venda com mais clareza.', 'Organize clientes, acompanhe retornos e use suas ferramentas em um só lugar.'),
      const SizedBox(height: 16),
      Row(children: [Expanded(child: _metric('Clientes', '${_clients.length}', Icons.people_alt_outlined)), const SizedBox(width: 10), Expanded(child: _metric('Retornos', '$pending', Icons.alarm)), const SizedBox(width: 10), Expanded(child: _metric('Vendas', '$sales', Icons.trending_up))]),
      const SizedBox(height: 22), _heading('Acesso rápido'),
      GridView.count(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.65, children: [
        _quick('Catálogo', Icons.inventory_2_outlined, () => _openTool('Catálogo')),
        _quick('Calculadoras', Icons.calculate_outlined, () => _openTool('Calculadoras')),
        _quick('KR Radar', Icons.radar, () => _openTool('KR Radar')),
        _quick('KR Academy', Icons.school_outlined, () => _openTool('KR Academy')),
      ]),
      const SizedBox(height: 20), _heading('Próximos retornos'),
      if (_reminders.where((e) => e['done'] != true).isEmpty) _empty('Seus próximos acompanhamentos aparecerão aqui.') else ..._reminders.where((e) => e['done'] != true).take(3).map(_reminderTile),
      const SizedBox(height: 18), _heading('Sugestão do dia'),
      _card(Row(crossAxisAlignment: CrossAxisAlignment.start, children: [const Icon(Icons.lightbulb_outline, color: _green), const SizedBox(width: 12), const Expanded(child: Text('Registre a próxima ação depois de cada conversa. Assim, o KR Radar consegue destacar oportunidades paradas com base nos seus próprios registros.'))])),
    ]);
  }

  Widget _assistant() => ListView(padding: const EdgeInsets.all(18), children: [
    _hero('KR Copiloto', 'Monte uma mensagem comercial usando seus dados e scripts cadastrados.'),
    const SizedBox(height: 12), _card(const Text('Assistência local por modelos e scripts. A conexão com um modelo de IA ainda depende de um endpoint seguro no backend; nenhuma chave de IA fica no APK.', style: TextStyle(color: Colors.white70))),
    const SizedBox(height: 18), TextField(controller: _assistantInput, minLines: 3, maxLines: 5, decoration: const InputDecoration(labelText: 'Contexto da conversa', hintText: 'Ex.: cliente pediu prazo para decidir...')),
    const SizedBox(height: 12), FilledButton.icon(onPressed: _generateReply, icon: const Icon(Icons.auto_awesome), label: const Text('Sugerir resposta')),
    if (_assistantOutput.isNotEmpty) ...[const SizedBox(height: 16), _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Sugestão baseada nos seus scripts', style: TextStyle(color: _green, fontWeight: FontWeight.bold)), const SizedBox(height: 8), SelectableText(_assistantOutput), Align(alignment: Alignment.centerRight, child: IconButton(onPressed: () { Clipboard.setData(ClipboardData(text: _assistantOutput)); _snack('Mensagem copiada.'); }, icon: const Icon(Icons.copy)))]))],
    const SizedBox(height: 18), _heading('Informações disponíveis'),
    ..._products.take(3).map((p) => _card(Text('${p['name']} · ${p['price'] ?? 'Preço não informado'}'))),
  ]);

  void _generateReply() {
    final contextText = _assistantInput.text.trim();
    if (contextText.isEmpty) { _snack('Escreva um resumo da conversa primeiro.'); return; }
    final chosen = contextText.toLowerCase().contains('pensar') ? _scripts.firstWhere((s) => s['category'] == 'Objeções') : _scripts.firstWhere((s) => s['category'] == 'Retorno');
    setState(() => _assistantOutput = 'Entendi o contexto: "$contextText"\n\n${chosen['text']}\n\nRevise e personalize a mensagem antes de enviar.');
  }

  Widget _scriptsPage() {
    final categories = ['Todos', ...{..._scripts.map((s) => s['category'] as String)}];
    final visible = _scripts.where((s) {
      final matchesCategory = _category == 'Todos' || s['category'] == _category;
      final matchesSearch = '${s['title']} ${s['text']}'.toLowerCase().contains(_search.text.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: TextField(controller: _search, onChanged: (_) => setState(() {}), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Pesquisar scripts')),
      ),
      SizedBox(
        height: 54,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          children: categories.map((c) => Padding(
                padding: const EdgeInsets.all(4),
                child: ChoiceChip(label: Text(c), selected: c == _category, onSelected: (_) => setState(() => _category = c)),
              )).toList(),
        ),
      ),
      Expanded(
        child: visible.isEmpty
            ? _empty('Nenhum script encontrado.')
            : ListView(
                padding: const EdgeInsets.all(16),
                children: visible.map((s) => _card(Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(child: Text('${s['title']}', style: const TextStyle(fontWeight: FontWeight.bold))),
                          IconButton(
                            onPressed: () { setState(() => s['favorite'] = !(s['favorite'] == true)); _save(); },
                            icon: Icon(s['favorite'] == true ? Icons.star : Icons.star_border, color: _green),
                          ),
                        ]),
                        Text('${s['category']}', style: const TextStyle(color: _green, fontSize: 12)),
                        const SizedBox(height: 8),
                        Text('${s['text']}'),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton.icon(
                            onPressed: () { Clipboard.setData(ClipboardData(text: '${s['text']}')); _snack('Script copiado.'); },
                            icon: const Icon(Icons.copy),
                            label: const Text('Copiar'),
                          ),
                        ),
                      ],
                    ))).toList(),
              ),
      ),
    ]);
  }

  Future<void> _addScript() async {
    final title = TextEditingController(); final category = TextEditingController(text: 'Personalizado'); final body = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Novo script'), content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: title, decoration: const InputDecoration(labelText: 'Título')), TextField(controller: category, decoration: const InputDecoration(labelText: 'Categoria')), TextField(controller: body, minLines: 3, maxLines: 6, decoration: const InputDecoration(labelText: 'Mensagem'))])), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salvar'))]));
    if (ok == true && title.text.trim().isNotEmpty && body.text.trim().isNotEmpty) { setState(() => _scripts.insert(0, {'title': title.text.trim(), 'category': category.text.trim().isEmpty ? 'Personalizado' : category.text.trim(), 'text': body.text.trim(), 'favorite': false})); _save(); }
  }

  Widget _clientsPage() => Column(children: [
    Padding(padding: const EdgeInsets.all(16), child: Row(children: [Expanded(child: Text('${_clients.length} clientes cadastrados', style: const TextStyle(color: Colors.white70))), FilledButton.icon(onPressed: _addClient, icon: const Icon(Icons.person_add_alt_1), label: const Text('Adicionar'))])),
    Expanded(child: _clients.isEmpty ? _empty('Cadastre um cliente para acompanhar sua negociação.') : ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 16), children: _clients.map((c) => _card(ListTile(contentPadding: EdgeInsets.zero, leading: CircleAvatar(backgroundColor: _green.withValues(alpha: .16), child: const Icon(Icons.person, color: _green)), title: Text('${c['name']}'), subtitle: Text('${c['stage']} · ${c['note'] ?? 'Sem anotação'}'), trailing: PopupMenuButton<String>(onSelected: (v) => v == 'reminder' ? _addReminder('${c['name']}') : _changeStage(c), itemBuilder: (_) => const [PopupMenuItem(value: 'reminder', child: Text('Agendar retorno')), PopupMenuItem(value: 'stage', child: Text('Avançar etapa'))])))).toList())),
  ]);

  Widget _morePage() {
    if (_tool == 'Ferramentas') {
      return ListView(padding: const EdgeInsets.all(18), children: [
        _hero('Ferramentas comerciais', 'Áreas complementares para organizar sua rotina de vendas.'), const SizedBox(height: 12),
        ...['Catálogo', 'Calculadoras', 'KR Radar', 'KR Academy', 'KR Performance', 'Lembretes', 'Integrações', 'Licença e acesso', 'Configurações'].map((name) => _card(ListTile(title: Text(name), trailing: const Icon(Icons.chevron_right), onTap: () => _openTool(name)))),
      ]);
    }
    switch (_tool) {
      case 'Catálogo': return _catalog();
      case 'Calculadoras': return _calculators();
      case 'KR Radar': return _radar();
      case 'KR Academy': return _academy();
      case 'KR Performance': return _performance();
      case 'Lembretes': return _remindersPage();
      case 'Integrações': return _integrations();
      case 'Licença e acesso': return _licensePage();
      default: return _settings();
    }
  }

  Widget _catalog() => ListView(padding: const EdgeInsets.all(18), children: [Row(children: [const Expanded(child: Text('Seus produtos e serviços', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold))), IconButton(onPressed: _addProduct, icon: const Icon(Icons.add_circle, color: _green))]), if (_products.isEmpty) _empty('Adicione itens para usar como referência nas conversas.') else ..._products.map((p) => _card(ListTile(title: Text('${p['name']}'), subtitle: Text('${p['description'] ?? 'Sem descrição'}'), trailing: Text(p['price']?.toString() ?? '—'))))]);

  Widget _calculators() => ListView(padding: const EdgeInsets.all(18), children: [
    const Text('Valores calculados no dispositivo. Preencha somente os dados conhecidos.'), const SizedBox(height: 12),
    _calcCard('Lucro e margem', ['Custo', 'Preço de venda'], (v) { final cost = _num(v[0]); final price = _num(v[1]); return 'Lucro: ${_money(Finance.profit(cost: cost, price: price))}  ·  Margem: ${Finance.margin(cost: cost, price: price).toStringAsFixed(1)}%'; }),
    _calcCard('Desconto', ['Preço', 'Desconto (%)'], (v) => 'Preço final: ${_money(Finance.discountPrice(price: _num(v[0]), discountPercent: _num(v[1])))}'),
    _calcCard('Comissão', ['Valor da venda', 'Comissão (%)'], (v) => 'Comissão: ${_money(Finance.commission(sale: _num(v[0]), ratePercent: _num(v[1])))}'),
    _calcCard('Parcelamento simples', ['Valor total', 'Número de parcelas'], (v) => 'Parcela: ${_money(Finance.installment(total: _num(v[0]), count: _num(v[1]).toInt()))} (sem juros)'),
  ]);

  Widget _radar() {
    final stale = _clients.where((c) => c['stage'] != 'Venda').toList()..sort((a,b) => (a['updated'] ?? '').compareTo(b['updated'] ?? ''));
    return ListView(padding: const EdgeInsets.all(18), children: [_hero('KR Radar', 'Prioridade calculada apenas a partir dos seus registros locais.'), const SizedBox(height: 12), if (stale.isEmpty) _empty('Cadastre clientes e registre as etapas para gerar prioridades.') else ...stale.map((c) => _card(ListTile(leading: const Icon(Icons.radar, color: _green), title: Text('${c['name']}'), subtitle: Text('Etapa: ${c['stage']} · Atualizado: ${c['updated'] ?? 'sem data'}'), trailing: IconButton(onPressed: () => _addReminder('${c['name']}'), icon: const Icon(Icons.alarm_add)))))]);
  }

  Widget _academy() => ListView(padding: const EdgeInsets.all(18), children: [
    _hero('KR Academy', 'Treino offline de abordagem e objeções.'), const SizedBox(height: 14),
    _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Simulação: “Está acima do que eu planejava investir.”', style: TextStyle(fontWeight: FontWeight.bold)), const SizedBox(height: 8), const Text('Escreva uma resposta que investigue a necessidade sem prometer desconto.'), const SizedBox(height: 12), TextField(controller: _academyAnswer, minLines: 3, maxLines: 5, decoration: const InputDecoration(hintText: 'Sua resposta')), const SizedBox(height: 10), FilledButton(onPressed: _evaluateTraining, child: const Text('Avaliar resposta'))])),
    const SizedBox(height: 12), _card(const Text('Critério de avaliação: pergunta de esclarecimento, empatia e ausência de promessas não cadastradas. A avaliação é baseada em regras locais, sem IA externa.')),
  ]);

  Widget _performance() {
    final won = _clients.where((c) => c['stage'] == 'Venda').length;
    final conversion = _clients.isEmpty ? 0.0 : won / _clients.length * 100;
    final revenue = _clients.where((c) => c['stage'] == 'Venda').fold<double>(0, (sum,c) => sum + _num(c['value']));
    return ListView(padding: const EdgeInsets.all(18), children: [_hero('KR Performance', 'Indicadores calculados dos dados cadastrados no aplicativo.'), const SizedBox(height: 12), _metric('Clientes registrados', '${_clients.length}', Icons.people), _metric('Vendas registradas', '$won', Icons.sell), _metric('Conversão registrada', '${conversion.toStringAsFixed(1)}%', Icons.show_chart), _metric('Valor de vendas registrado', _money(revenue), Icons.payments), const SizedBox(height: 10), const Text('Resultados não incluem dados da extensão ou do site até que exista uma API de sincronização autorizada.')]);
  }

  Widget _remindersPage() => ListView(padding: const EdgeInsets.all(18), children: [Row(children: [const Expanded(child: Text('Acompanhamentos')), IconButton(onPressed: () => _addReminder('Retorno comercial'), icon: const Icon(Icons.add_alarm, color: _green))]), if (_reminders.isEmpty) _empty('Nenhum lembrete cadastrado.') else ..._reminders.map(_reminderTile)]);

  Widget _integrations() => ListView(padding: const EdgeInsets.all(18), children: [_hero('Integrações', 'Ações manuais compatíveis com os aplicativos instalados no celular.'), const SizedBox(height: 12), _card(ListTile(leading: const Icon(Icons.chat, color: _green), title: const Text('WhatsApp'), subtitle: const Text('Abrir conversa por número informado'), onTap: _openWhatsApp)), _card(ListTile(leading: const Icon(Icons.share_outlined), title: const Text('Compartilhar script'), subtitle: const Text('Copie um script e cole no canal que você escolher'), onTap: () { _tab = 2; setState(() {}); })), const SizedBox(height: 12), const Text('Instagram e Facebook Messenger não têm automação conectada. A integração com APIs oficiais requer credenciais e configuração de backend.')]);

  Widget _licensePage() => ListView(padding: const EdgeInsets.all(18), children: [_hero('Licença e acesso', 'O projeto atual valida chaves no Firebase Realtime Database.'), const SizedBox(height: 12), _card(const Text('Auditoria: o código web usa consulta por hash SHA-256 ao Firebase, mas a URL do banco aparece vazia nos arquivos consultados e não há autenticação de usuário dedicada para o Android. Não é seguro afirmar que a licença está conectada neste APK. Configure a URL pública de banco e uma validação server-side antes de ativar o acesso privado.'))]);

  Widget _settings() => ListView(padding: const EdgeInsets.all(18), children: [_hero('Configurações', 'KR Easy Extension · Versão Android nativa'), const SizedBox(height: 12), _card(ListTile(title: const Text('Exportar dados locais'), subtitle: const Text('Copiar backup JSON para área de transferência'), leading: const Icon(Icons.backup_outlined), onTap: _exportData)), _card(ListTile(title: const Text('Diagnóstico'), leading: const Icon(Icons.health_and_safety_outlined), onTap: _help)), _card(const ListTile(title: Text('Privacidade'), subtitle: Text('Clientes, produtos e lembretes ficam no dispositivo nesta versão.')))]);

  Widget _calcCard(String title, List<String> labels, String Function(List<String>) calculate) => _CalcCard(title: title, labels: labels, calculate: calculate);
  Widget _hero(String title, String subtitle) => Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(gradient: LinearGradient(colors: [_green.withValues(alpha: .22), _panel]), borderRadius: BorderRadius.circular(22), border: Border.all(color: _green.withValues(alpha: .22))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800)), const SizedBox(height: 6), Text(subtitle, style: const TextStyle(color: Colors.white70))]));
  Widget _heading(String text) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)));
  Widget _metric(String label, String value, IconData icon) => _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon, color: _green), const SizedBox(height: 10), Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)), Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70))]));
  Widget _quick(String label, IconData icon, VoidCallback onTap) => _card(InkWell(onTap: onTap, borderRadius: BorderRadius.circular(18), child: Row(children: [Icon(icon, color: _green), const SizedBox(width: 10), Flexible(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)))])));
  Widget _card(Widget child) => Container(margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(15), decoration: BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withValues(alpha: .05))), child: child);
  Widget _empty(String message) => Center(child: Padding(padding: const EdgeInsets.all(26), child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white60))));
  Widget _reminderTile(Map<String, dynamic> r) => _card(
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(r['done'] == true ? Icons.check_circle : Icons.alarm, color: _green),
          title: Text('${r['title']}'),
          subtitle: Text('${r['date']}'),
          trailing: IconButton(
            onPressed: () { setState(() => r['done'] = !(r['done'] == true)); _save(); },
            icon: Icon(r['done'] == true ? Icons.undo : Icons.check),
          ),
        ),
      );

  void _openTool(String name) => setState(() { _tab = 4; _tool = name; });
  void _snack(String message) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  String _money(double value) => 'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';
  double _num(Object? value) => double.tryParse('${value ?? ''}'.replaceAll(',', '.')) ?? 0;

  Future<void> _addClient() async {
    final name = TextEditingController(); final note = TextEditingController(); final value = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Novo cliente'), content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')), TextField(controller: note, decoration: const InputDecoration(labelText: 'Anotação')), TextField(controller: value, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Valor potencial (opcional)'))]), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salvar'))]));
    if (ok == true && name.text.trim().isNotEmpty) { setState(() => _clients.add({'name': name.text.trim(), 'note': note.text.trim(), 'stage': 'Novo', 'value': _num(value.text), 'updated': DateTime.now().toIso8601String().substring(0,10)})); _save(); }
  }

  Future<void> _addProduct() async {
    final name = TextEditingController(); final desc = TextEditingController(); final price = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Novo produto ou serviço'), content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')), TextField(controller: desc, decoration: const InputDecoration(labelText: 'Descrição / benefício')), TextField(controller: price, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Preço'))]), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salvar'))]));
    if (ok == true && name.text.trim().isNotEmpty) { setState(() => _products.add({'name': name.text.trim(), 'description': desc.text.trim(), 'price': price.text.trim()})); _save(); }
  }

  Future<void> _addReminder(String title) async {
    final date = await showDatePicker(context: context, initialDate: DateTime.now().add(const Duration(days: 1)), firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365 * 3)));
    if (date == null) return;
    setState(() => _reminders.add({'title': title, 'date': '${date.day.toString().padLeft(2,'0')}/${date.month.toString().padLeft(2,'0')}/${date.year}', 'done': false})); await _save(); _snack('Retorno agendado.');
  }

  void _changeStage(Map<String, dynamic> c) { final stages = ['Novo', 'Contato', 'Negociação', 'Venda']; final next = (stages.indexOf('${c['stage']}') + 1) % stages.length; setState(() { c['stage'] = stages[next]; c['updated'] = DateTime.now().toIso8601String().substring(0,10); }); _save(); }

  Future<void> _openWhatsApp() async {
    final phone = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Abrir WhatsApp'), content: TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Número com código do país', hintText: '5511999999999')), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Abrir'))]));
    if (ok == true && phone.text.isNotEmpty) { final uri = Uri.parse('https://wa.me/${phone.text.replaceAll(RegExp(r'\D'), '')}'); if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) _snack('Não foi possível abrir o WhatsApp.'); }
  }

  void _evaluateTraining() {
    final answer = _academyAnswer.text.trim();
    final lower = answer.toLowerCase();
    final hasQuestion = lower.contains('?'); final empathic = ['entendo','compreendo','faz sentido','claro'].any(lower.contains); final risky = ['garantido','desconto de','prometo','sem custo'].any(lower.contains);
    if (answer.isEmpty) { _snack('Escreva sua resposta antes de avaliar.'); return; }
    final score = (hasQuestion ? 1 : 0) + (empathic ? 1 : 0) + (!risky ? 1 : 0);
    _snack('Avaliação: $score/3. ${risky ? 'Evite prometer condição não cadastrada.' : hasQuestion ? 'Boa investigação da necessidade.' : 'Inclua uma pergunta para entender a objeção.'}');
  }

  Future<void> _exportData() async {
    final backup = jsonEncode({'clients': _clients, 'products': _products, 'reminders': _reminders, 'scripts': _scripts, 'exportedAt': DateTime.now().toIso8601String()});
    await Clipboard.setData(ClipboardData(text: backup)); _snack('Backup JSON copiado. Guarde em local seguro.');
  }

  void _help() => showDialog<void>(context: context, builder: (ctx) => AlertDialog(title: const Text('Ajuda e diagnóstico'), content: const Text('Dados são armazenados localmente neste aparelho. A sincronização, login, validação de licença, notificações agendadas e IA conectada ainda dependem de integração segura ao backend do KR Easy Extension.'), actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Entendi'))]));
}

class _CalcCard extends StatefulWidget {
  const _CalcCard({required this.title, required this.labels, required this.calculate});
  final String title; final List<String> labels; final String Function(List<String>) calculate;
  @override State<_CalcCard> createState() => _CalcCardState();
}
class _CalcCardState extends State<_CalcCard> {
  late final fields = widget.labels.map((_) => TextEditingController()).toList();
  String result = '';
  @override void dispose() { for (final f in fields) { f.dispose(); } super.dispose(); }
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(18)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.title, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...List.generate(widget.labels.length, (i) => Padding(
                padding: const EdgeInsets.only(top: 7),
                child: TextField(controller: fields[i], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: widget.labels[i])),
              )),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => setState(() { result = widget.calculate(fields.map((f) => f.text).toList()); }), child: const Text('Calcular')),
          if (result.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(result, style: const TextStyle(color: _green, fontWeight: FontWeight.bold))),
        ]),
      );
}
