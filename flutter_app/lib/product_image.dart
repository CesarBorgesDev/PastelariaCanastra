import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ProductImage extends StatefulWidget {
  const ProductImage({
    super.key,
    required this.url,
    required this.placeholder,
    this.fallbackAsset,
  });

  final String url;
  final Widget placeholder;
  final String? fallbackAsset;

  @override
  State<ProductImage> createState() => _ProductImageState();
}

class _ProductImageState extends State<ProductImage> {
  static final Map<String, Uint8List> _cache = {};

  Uint8List? _bytes;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ProductImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _bytes = null;
      _failed = false;
      _load();
    }
  }

  Future<void> _load() async {
    final cached = _cache[widget.url];
    if (cached != null) {
      if (mounted) setState(() => _bytes = cached);
      return;
    }
    try {
      final response = await http
          .get(Uri.parse(widget.url), headers: const {'Accept': 'image/*,*/*'})
          .timeout(const Duration(seconds: 20));
      if (response.statusCode != 200 || response.bodyBytes.isEmpty) {
        throw Exception('Imagem indisponível');
      }
      _cache[widget.url] = response.bodyBytes;
      if (!mounted) return;
      setState(() => _bytes = response.bodyBytes);
    } catch (_) {
      if (!mounted) return;
      setState(() => _failed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_bytes != null) {
      return Image.memory(
        _bytes!,
        fit: BoxFit.cover,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _fallback(),
      );
    }
    if (_failed) return _fallback();
    return const ColoredBox(color: Color(0xFF262626));
  }

  Widget _fallback() {
    final asset = widget.fallbackAsset;
    if (asset != null) return Image.asset(asset, fit: BoxFit.cover);
    return widget.placeholder;
  }
}

String? resolveProductImageUrl(String backendUrl, String imageUrl) {
  final raw = imageUrl.trim();
  if (raw.isEmpty) return null;
  final origin = _origin(backendUrl);

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    final parsed = Uri.tryParse(raw);
    if (parsed == null || parsed.host.isEmpty) return raw;
    if (_isLocalHost(parsed.host) && origin != null) {
      return origin.replace(path: parsed.path, query: parsed.query).toString();
    }
    return parsed.toString();
  }

  if (origin == null) return null;
  final path = raw.startsWith('/') ? raw : '/$raw';
  return origin.replace(path: path).toString();
}

Uri? _origin(String backendUrl) {
  var text = backendUrl.trim();
  if (text.isEmpty) return null;
  if (!text.contains('://')) text = 'http://$text';
  final uri = Uri.tryParse(text);
  if (uri == null || uri.host.isEmpty) return null;
  return Uri(
    scheme: uri.scheme,
    host: uri.host,
    port: uri.hasPort ? uri.port : null,
  );
}

bool _isLocalHost(String host) {
  final value = host.toLowerCase();
  return value == 'localhost' || value == '127.0.0.1' || value == '0.0.0.0' || value == '10.0.2.2';
}
