class Product {
  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.imageUrl,
    required this.available,
  });

  final String id;
  final String name;
  final String description;
  final double price;
  final String category;
  final String imageUrl;
  final bool available;

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: '${json['id']}',
      name: '${json['name'] ?? ''}',
      description: '${json['description'] ?? ''}',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      category: '${json['category'] ?? ''}',
      imageUrl: '${json['image_url'] ?? ''}',
      available: json['available'] != false,
    );
  }
}

class CartItem {
  CartItem({required this.product, this.quantity = 1, this.notes = ''});

  final Product product;
  int quantity;
  String notes;

  double get lineTotal => product.price * quantity;
}

class OrderItem {
  OrderItem({
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.notes,
  });

  final String productName;
  final int quantity;
  final double unitPrice;
  final String notes;

  Map<String, dynamic> toJson() => {
        'product_name': productName,
        'quantity': quantity,
        'unit_price': unitPrice,
        'notes': notes,
      };
}

class Order {
  Order({
    required this.orderNumber,
    required this.items,
    required this.total,
    required this.barcode,
    this.id,
    this.status = 'pendente',
  });

  final int orderNumber;
  final List<OrderItem> items;
  final double total;
  final String barcode;
  final String? id;
  final String status;

  Map<String, dynamic> toJson() => {
        'order_number': orderNumber,
        'items': items.map((item) => item.toJson()).toList(),
        'total': total,
        'status': status,
        'barcode': barcode,
      };
}
