import 'package:flutter_test/flutter_test.dart';
import 'package:pastelaria_canastra/models.dart';

void main() {
  test('produto do backend conserva nome, preço e categoria', () {
    final product = Product.fromJson({
      'id': '1',
      'name': 'Pastel de Carne',
      'description': 'Carne moída',
      'price': 12,
      'category': 'Pastéis Salgados',
      'image_url': '',
      'available': true,
    });

    expect(product.name, 'Pastel de Carne');
    expect(product.price, 12);
    expect(product.category, 'Pastéis Salgados');
  });
}
