import 'package:flutter/material.dart';

import 'api.dart';
import 'models.dart';
import 'printer.dart';
import 'settings_store.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PastelariaApp());
}

class PastelariaApp extends StatefulWidget {
  const PastelariaApp({super.key});

  @override
  State<PastelariaApp> createState() => _PastelariaAppState();
}

class _PastelariaAppState extends State<PastelariaApp> {
  AppSettings? _settings;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final settings = await AppSettings.load();
    if (!mounted) return;
    setState(() => _settings = settings);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pastelaria Canastra',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF121212),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFE86A24),
          surface: Color(0xFF1C1C1C),
        ),
        useMaterial3: true,
      ),
      home: _settings == null
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : HomePage(settings: _settings!, onSettingsSaved: _reload),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.settings, required this.onSettingsSaved});

  final AppSettings settings;
  final Future<void> Function() onSettingsSaved;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final List<CartItem> _cart = [];
  List<Product> _products = [];
  String _category = 'Todos';
  bool _loading = true;
  String? _error;
  int _orderSeed = 100;

  static const _categories = ['Todos', 'Pastéis Salgados', 'Pastéis Doces', 'Bebidas', 'Adicionais'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(HomePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.settings.backendUrl != widget.settings.backendUrl) _load();
  }

  Future<void> _load() async {
    if (!widget.settings.hasBackend) {
      setState(() {
        _loading = false;
        _products = [];
        _error = 'Informe o endereço do backend.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final products = await PastelariaApi(widget.settings.backendUrl).listAvailable();
      if (!mounted) return;
      setState(() {
        _products = products;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _loading = false;
      });
    }
  }

  List<Product> get _visible {
    if (_category == 'Todos') return _products;
    return _products.where((product) => product.category == _category).toList();
  }

  double get _total => _cart.fold(0, (sum, item) => sum + item.lineTotal);

  void _add(Product product) {
    setState(() {
      final index = _cart.indexWhere((item) => item.product.id == product.id);
      if (index >= 0) {
        _cart[index].quantity += 1;
      } else {
        _cart.add(CartItem(product: product));
      }
    });
  }

  Future<void> _openSettings() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => SettingsPage(settings: widget.settings)),
    );
    if (saved == true) await widget.onSettingsSaved();
  }

  Future<void> _finish() async {
    if (_cart.isEmpty) return;
    if (!widget.settings.hasPrinter) {
      _message('Informe o IP da impressora Control iD.');
      return;
    }
    final items = _cart
        .map((item) => OrderItem(
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              notes: item.notes,
            ))
        .toList();
    final number = _orderSeed + 1;
    final order = Order(
      orderNumber: number,
      items: items,
      total: _total,
      barcode: 'CMD-$number-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
    );
    try {
      final id = await PastelariaApi(widget.settings.backendUrl).createOrder(order);
      final saved = Order(
        id: id,
        orderNumber: order.orderNumber,
        items: order.items,
        total: order.total,
        barcode: order.barcode,
      );
      await ControlIdPrinter(ip: widget.settings.printerIp, port: widget.settings.printerPort).printOrder(saved);
      if (!mounted) return;
      setState(() {
        _orderSeed = number;
        _cart.clear();
      });
      _message('Pedido #$number impresso.');
    } catch (error) {
      _message('$error');
    }
  }

  void _message(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pastelaria Canastra'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
          IconButton(onPressed: _openSettings, icon: const Icon(Icons.settings)),
        ],
      ),
      body: Column(
        children: [
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                for (final category in _categories)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(category == 'Pastéis Salgados'
                          ? 'Salgados'
                          : category == 'Pastéis Doces'
                              ? 'Doces'
                              : category),
                      selected: _category == category,
                      onSelected: (_) => setState(() => _category = category),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(child: _buildMenu()),
          _cartBar(),
        ],
      ),
    );
  }

  Widget _buildMenu() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)));
    }
    final products = _visible;
    if (products.isEmpty) return const Center(child: Text('Nenhum produto encontrado'));
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.15,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return Material(
          color: const Color(0xFF1C1C1C),
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _add(product),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, maxLines: 2, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(product.description, maxLines: 2, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const Spacer(),
                  Text('R\$ ${product.price.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFFE86A24), fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _cartBar() {
    return Material(
      color: const Color(0xFF1C1C1C),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: Text('${_cart.fold<int>(0, (sum, item) => sum + item.quantity)} itens\nR\$ ${_total.toStringAsFixed(2)}'),
              ),
              FilledButton(
                onPressed: _cart.isEmpty ? null : _finish,
                child: const Text('Imprimir pedido'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key, required this.settings});

  final AppSettings settings;

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late final TextEditingController _backend;
  late final TextEditingController _printer;
  late final TextEditingController _port;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _backend = TextEditingController(text: widget.settings.backendUrl);
    _printer = TextEditingController(text: widget.settings.printerIp);
    _port = TextEditingController(text: '${widget.settings.printerPort}');
  }

  @override
  void dispose() {
    _backend.dispose();
    _printer.dispose();
    _port.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final port = int.tryParse(_port.text.trim());
    if (port == null || port < 1 || port > 65535) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Porta da impressora inválida.')));
      return;
    }
    setState(() => _saving = true);
    final settings = AppSettings(
      backendUrl: _backend.text.trim(),
      printerIp: _printer.text.trim(),
      printerPort: port,
    );
    await settings.save();
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configuração')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text('Backend', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: _backend,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(
              labelText: 'Endereço',
              hintText: 'http://192.168.0.10',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Impressora Control iD', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: _printer,
            decoration: const InputDecoration(
              labelText: 'IP',
              hintText: '192.168.0.128',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _port,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Porta',
              helperText: 'Print iD usa 9100 (ESC/POS). O cupom sai com letras tamanho 14.',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Salvando...' : 'Salvar'),
          ),
        ],
      ),
    );
  }
}
