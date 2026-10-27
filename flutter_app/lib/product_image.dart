import 'package:flutter/material.dart';

class ProductImage extends StatelessWidget {
  const ProductImage({
    super.key,
    required this.url,
    required this.placeholder,
  });

  final String url;
  final Widget placeholder;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: BoxFit.cover,
      gaplessPlayback: true,
      errorBuilder: (_, __, ___) => placeholder,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return const ColoredBox(color: Color(0xFF262626));
      },
    );
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
