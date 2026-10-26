import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class PastelariaApi {
  PastelariaApi(this.baseUrl);

  final String baseUrl;

  Uri _uri(String path) {
    final root = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    return Uri.parse('$root$path');
  }

  Future<List<Product>> listAvailable() async {
    final response = await http.get(_uri('/api/products?available=true'));
    if (response.statusCode != 200) {
      throw ApiException('Não foi possível carregar o cardápio (${response.statusCode}).');
    }
    final body = jsonDecode(response.body);
    if (body is! List) throw ApiException('Resposta inválida do backend.');
    return body.whereType<Map<String, dynamic>>().map(Product.fromJson).toList();
  }

  Future<String> createOrder(Order order) async {
    final response = await http.post(
      _uri('/api/orders'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(order.toJson()),
    );
    if (response.statusCode != 201) {
      throw ApiException('Não foi possível gravar o pedido (${response.statusCode}).');
    }
    final body = jsonDecode(response.body);
    if (body is! Map || body['id'] == null) {
      throw ApiException('O backend não devolveu o pedido.');
    }
    return '${body['id']}';
  }
}
