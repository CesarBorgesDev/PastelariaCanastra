import 'package:flutter/material.dart';

import 'api.dart';
import 'models.dart';
import 'printer.dart';
import 'product_image.dart';
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
          primary: Color(0xFFE8591C),
          onPrimary: Color(0xFFFFFFFF),
          secondary: Color(0xFF262626),
          onSecondary: Color(0xFFF2F2F2),
          secondaryContainer: Color(0xFFE8591C),
          onSecondaryContainer: Color(0xFFFFFFFF),
          surface: Color(0xFF1A1A1A),
          onSurface: Color(0xFFF2F2F2),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: const Color(0xFF262626),
          selectedColor: const Color(0xFFE8591C),
          disabledColor: const Color(0xFF262626),
          labelStyle: const TextStyle(color: Color(0xFF8C8C8C), fontWeight: FontWeight.w600, fontSize: 14),
          secondaryLabelStyle: const TextStyle(color: Color(0xFFFFFFFF), fontWeight: FontWeight.w600, fontSize: 14),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          side: BorderSide.none,
          showCheckmark: false,
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

  void _clear(Product product) {
    setState(() {
      _cart.removeWhere((item) => item.product.id == product.id);
    });
  }

  Future<void> _openSettings() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => SettingsPage(settings: widget.settings)),
    );
    if (saved == true) await widget.onSettingsSaved();
  }

  int _quantityOf(Product product) {
    final index = _cart.indexWhere((item) => item.product.id == product.id);
    if (index < 0) return 0;
    return _cart[index].quantity;
  }

  Future<int?> _askComanda() {
    final controller = TextEditingController();
    return showDialog<int>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Fazer pedido'),
          content: TextField(
            controller: controller,
            autofocus: true,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Número da comanda',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancelar')),
            FilledButton(
              onPressed: () {
                final number = int.tryParse(controller.text.trim());
                if (number == null || number <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Informe o número da comanda.')),
                  );
                  return;
                }
                Navigator.of(context).pop(number);
              },
              child: const Text('Confirmar'),
            ),
          ],
        );
      },
    ).whenComplete(controller.dispose);
  }

  Future<void> _finish() async {
    if (_cart.isEmpty) return;
    if (!widget.settings.hasPrinter) {
      _message('Informe o IP da impressora Control iD.');
      return;
    }
    final number = await _askComanda();
    if (number == null || !mounted) return;
    final items = _cart
        .map((item) => OrderItem(
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              notes: item.notes,
            ))
        .toList();
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
      await ControlIdPrinter(
        ip: widget.settings.printerIp,
        port: widget.settings.printerPort,
        fontSize: widget.settings.printFontSize.toDouble(),
      ).printOrder(saved);
      if (!mounted) return;
      setState(_cart.clear);
      _message('Comanda $number impressa.');
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
                      showCheckmark: false,
                      selectedColor: const Color(0xFFE8591C),
                      backgroundColor: const Color(0xFF262626),
                      labelStyle: TextStyle(
                        color: _category == category ? const Color(0xFFFFFFFF) : const Color(0xFF8C8C8C),
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                      side: BorderSide.none,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
    final columns = widget.settings.cardsPerRow;
    final descriptionSize = widget.settings.descriptionFontSize.toDouble();
    final width = MediaQuery.sizeOf(context).width;
    const padding = 12.0;
    const spacing = 8.0;
    final cardWidth = (width - padding * 2 - spacing * (columns - 1)) / columns;
    final textHeight = 28 + (15 * 1.35 * 2) + (descriptionSize * 1.35 * 2) + 24;
    final cardHeight = cardWidth * 0.72 + textHeight;
    return GridView.builder(
      padding: const EdgeInsets.all(padding),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        childAspectRatio: cardWidth / cardHeight,
        crossAxisSpacing: spacing,
        mainAxisSpacing: spacing,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        final quantity = _quantityOf(product);
        return Material(
          color: const Color(0xFF1A1A1A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: quantity > 0 ? const Color(0xFFE8591C) : const Color(0xFF2E2E2E)),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => _add(product),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _productIcon(product),
                    if (quantity > 0) ...[
                      Positioned(
                        top: 6,
                        left: 6,
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          decoration: const BoxDecoration(
                            color: Color(0xFFE8591C),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '$quantity',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () => _clear(product),
                          behavior: HitTestBehavior.opaque,
                          child: Container(
                            width: 30,
                            height: 30,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1A1A1A),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 1.5),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.close, size: 16, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, height: 1.2),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        product.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: const Color(0xFF8C8C8C), fontSize: descriptionSize, height: 1.2),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'R\$ ${product.price.toStringAsFixed(2)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFFE8591C), fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _productIcon(Product product) {
    final url = resolveProductImageUrl(widget.settings.backendUrl, product.imageUrl);
    if (url == null) return _emojiIcon(product);
    return ProductImage(url: url, placeholder: _emojiIcon(product));
  }

  Widget _emojiIcon(Product product) {
    return ColoredBox(
      color: const Color(0xFF262626),
      child: Center(child: Text(_emoji(product.category), style: const TextStyle(fontSize: 40))),
    );
  }

  String _emoji(String category) {
    if (category == 'Pastéis Salgados') return '🥟';
    if (category == 'Pastéis Doces') return '🍫';
    if (category == 'Bebidas') return '🥤';
    if (category == 'Adicionais') return '➕';
    return '🍽️';
  }

  Widget _cartBar() {
    return Material(
      color: const Color(0xFF1A1A1A),
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
                child: const Text('Fazer pedido'),
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
  late int _fontSize;
  late int _cardsPerRow;
  late int _descriptionFontSize;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _backend = TextEditingController(text: widget.settings.backendUrl);
    _printer = TextEditingController(text: widget.settings.printerIp);
    _port = TextEditingController(text: '${widget.settings.printerPort}');
    _fontSize = widget.settings.printFontSize;
    _cardsPerRow = widget.settings.cardsPerRow;
    _descriptionFontSize = widget.settings.descriptionFontSize;
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
      printFontSize: _fontSize,
      cardsPerRow: _cardsPerRow,
      descriptionFontSize: _descriptionFontSize,
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
          const Text('Cardápio', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('Produtos por linha: $_cardsPerRow', style: const TextStyle(fontWeight: FontWeight.w700)),
          Slider(
            value: _cardsPerRow.toDouble(),
            min: AppSettings.cardsPerRowMin.toDouble(),
            max: AppSettings.cardsPerRowMax.toDouble(),
            divisions: AppSettings.cardsPerRowMax - AppSettings.cardsPerRowMin,
            label: '$_cardsPerRow',
            onChanged: (value) => setState(() => _cardsPerRow = value.round()),
          ),
          Text('Tamanho da descrição: $_descriptionFontSize', style: const TextStyle(fontWeight: FontWeight.w700)),
          Slider(
            value: _descriptionFontSize.toDouble(),
            min: AppSettings.descriptionFontSizeMin.toDouble(),
            max: AppSettings.descriptionFontSizeMax.toDouble(),
            divisions: AppSettings.descriptionFontSizeMax - AppSettings.descriptionFontSizeMin,
            label: '$_descriptionFontSize',
            onChanged: (value) => setState(() => _descriptionFontSize = value.round()),
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
              helperText: 'Print iD usa 9100 (ESC/POS).',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),
          Text('Tamanho da fonte: $_fontSize', style: const TextStyle(fontWeight: FontWeight.w700)),
          Slider(
            value: _fontSize.toDouble(),
            min: AppSettings.printFontSizeMin.toDouble(),
            max: AppSettings.printFontSizeMax.toDouble(),
            divisions: AppSettings.printFontSizeMax - AppSettings.printFontSizeMin,
            label: '$_fontSize',
            onChanged: (value) => setState(() => _fontSize = value.round()),
          ),
          const Text(
            'Vale para os itens do cupom. O número da comanda sai sempre em letras grandes.',
            style: TextStyle(color: Color(0xFF8C8C8C), fontSize: 12),
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
