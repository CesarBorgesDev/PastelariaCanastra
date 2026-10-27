import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ProductImage extends StatefulWidget {
  const ProductImage({
    super.key,
    required this.url,
    required this.placeholder,
  });

  final String url;
  final Widget placeholder;

  @override
  State<ProductImage> createState() => _ProductImageState();
}

class _ProductImageState extends State<ProductImage> {
  static final Map<String, Uint8List> _cache = {};
  static final Map<String, Future<Uint8List>> _pending = {};

  Uint8List? _bytes;

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
      final future = _pending.putIfAbsent(widget.url, () async {
        final response = await http
            .get(Uri.parse(widget.url))
            .timeout(const Duration(seconds: 20));
        if (response.statusCode != 200 || !_isImage(response.bodyBytes)) {
          throw Exception('Imagem indisponível');
        }
        return response.bodyBytes;
      });
      final bytes = await future;
      _cache[widget.url] = bytes;
      if (!mounted) return;
      setState(() => _bytes = bytes);
    } catch (_) {
      _pending.remove(widget.url);
      if (!mounted) return;
      setState(() => _bytes = null);
    } finally {
      if (_cache.containsKey(widget.url)) _pending.remove(widget.url);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bytes = _bytes;
    if (bytes == null) return widget.placeholder;
    return Image.memory(
      bytes,
      fit: BoxFit.cover,
      gaplessPlayback: true,
      errorBuilder: (_, __, ___) => widget.placeholder,
    );
  }
}

String? resolveProductImageUrl(String backendUrl, String imageUrl) {
  final raw = imageUrl.trim();
  if (raw.isEmpty) return null;
  final origin = _origin(backendUrl);
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    final parsed = Uri.tryParse(raw);
    if (parsed == null || parsed.host.isEmpty || origin == null) return raw;
    if (_isLocalHost(parsed.host)) {
      return '${origin.origin}${parsed.path}${parsed.hasQuery ? '?${parsed.query}' : ''}';
    }
    return parsed.toString();
  }
  if (origin == null) return null;
  final path = raw.startsWith('/') ? raw : '/$raw';
  return '${origin.origin}$path';
}

Uri? _origin(String backendUrl) {
  var text = backendUrl.trim();
  if (text.isEmpty) text = 'http://127.0.0.1';
  if (!text.contains('://')) text = 'http://$text';
  text = text.replaceFirst(RegExp(r'/api/?$'), '');
  text = text.replaceAll(RegExp(r'/+$'), '');
  final uri = Uri.tryParse(text);
  if (uri == null || !uri.hasScheme || uri.host.isEmpty) return null;
  return uri;
}

bool _isImage(List<int> bytes) {
  if (bytes.length < 12) return false;
  final jpeg = bytes[0] == 0xFF && bytes[1] == 0xD8;
  final png = bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
  final gif = bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46;
  final webp = bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50;
  return jpeg || png || gif || webp;
}

bool _isLocalHost(String host) {
  final value = host.toLowerCase();
  return value == 'localhost' || value == '127.0.0.1' || value == '0.0.0.0' || value == '10.0.2.2';
}
