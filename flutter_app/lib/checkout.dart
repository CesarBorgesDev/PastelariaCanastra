import 'package:flutter/material.dart';

import 'api.dart';
import 'models.dart';

class CheckoutChoice {
  CheckoutChoice({required this.attendant, this.orderNumber, required this.isEstufa});

  final Attendant attendant;
  final int? orderNumber;
  final bool isEstufa;
}

class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key, required this.api});

  final PastelariaApi api;

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  List<Attendant> _attendants = [];
  Attendant? _attendant;
  String _comanda = '';
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final attendants = await widget.api.listAttendants();
      if (!mounted) return;
      setState(() {
        _attendants = attendants;
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

  void _select(Attendant attendant) {
    setState(() {
      _attendant = attendant;
      _comanda = '';
    });
  }

  void _digit(String digit) {
    if (_comanda.length >= 6) return;
    setState(() => _comanda += digit);
  }

  void _confirmComanda() {
    final number = int.tryParse(_comanda);
    final attendant = _attendant;
    if (attendant == null || number == null || number < 1) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Digite o número da comanda.')));
      return;
    }
    Navigator.of(context).pop(CheckoutChoice(attendant: attendant, orderNumber: number, isEstufa: false));
  }

  void _confirmEstufa() {
    final attendant = _attendant;
    if (attendant == null) return;
    Navigator.of(context).pop(CheckoutChoice(attendant: attendant, isEstufa: true));
  }

  @override
  Widget build(BuildContext context) {
    final attendant = _attendant;
    return PopScope(
      canPop: attendant == null,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop || attendant == null) return;
        setState(() => _attendant = null);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(attendant == null ? 'Quem está atendendo?' : attendant.name),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (_attendant != null) {
                setState(() => _attendant = null);
                return;
              }
              Navigator.of(context).pop();
            },
          ),
        ),
        body: attendant == null ? _attendantGrid() : _comandaPad(),
      ),
    );
  }

  Widget _attendantGrid() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)));
    }
    if (_attendants.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Nenhum atendente ativo. Cadastre no painel de administração.', textAlign: TextAlign.center),
        ),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.7,
      ),
      itemCount: _attendants.length,
      itemBuilder: (context, index) {
        final attendant = _attendants[index];
        return Material(
          color: const Color(0xFF1A1A1A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF2E2E2E)),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _select(attendant),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  attendant.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _comandaPad() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            height: 84,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A1A),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF2E2E2E)),
            ),
            child: Text(
              _comanda.isEmpty ? '—' : _comanda,
              style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, letterSpacing: 6),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.count(
              crossAxisCount: 3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.6,
              children: [
                for (final digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']) _key(digit, () => _digit(digit)),
                const SizedBox.shrink(),
                _key('0', () => _digit('0')),
                _keyIcon(Icons.backspace_outlined, () => setState(() {
                      if (_comanda.isNotEmpty) _comanda = _comanda.substring(0, _comanda.length - 1);
                    })),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton(
              onPressed: _comanda.isEmpty ? null : _confirmComanda,
              child: const Text('Confirmar comanda'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton(
              onPressed: _confirmEstufa,
              child: const Text('Estufa — sem número de comanda'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _key(String label, VoidCallback onTap) {
    return Material(
      color: const Color(0xFF1A1A1A),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF2E2E2E)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Center(child: Text(label, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800))),
      ),
    );
  }

  Widget _keyIcon(IconData icon, VoidCallback onTap) {
    return Material(
      color: const Color(0xFF262626),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF2E2E2E)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Center(child: Icon(icon)),
      ),
    );
  }
}
