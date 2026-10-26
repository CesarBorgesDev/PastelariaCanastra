import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/painting.dart';

import 'models.dart';

class PrinterException implements Exception {
  PrinterException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Impressora Control iD Print iD, protocolo Epson ESC/POS na porta TCP 9100.
class ControlIdPrinter {
  ControlIdPrinter({required this.ip, required this.port});

  final String ip;
  final int port;

  static const receiptFontSize = 14.0;
  static const paperWidth = 576;

  Future<void> printOrder(Order order) async {
    final raster = await _receiptRaster(order);
    final bytes = BytesBuilder();
    bytes.add([0x1B, 0x40]);
    bytes.add(raster);
    bytes.add([0x1B, 0x64, 0x04]);
    bytes.add([0x1D, 0x56, 0x42, 0x00]);
    await _send(bytes.toBytes());
  }

  Future<void> _send(Uint8List payload) async {
    Socket? socket;
    try {
      socket = await Socket.connect(ip, port, timeout: const Duration(seconds: 5));
      socket.add(payload);
      await socket.flush();
    } on SocketException catch (error) {
      throw PrinterException('Não foi possível falar com a impressora em $ip:$port. ${error.message}');
    } finally {
      await socket?.close();
    }
  }

  Future<Uint8List> _receiptRaster(Order order) async {
    final lines = <_Line>[
      const _Line('PASTELARIA CANASTRA', bold: true, center: true),
      const _Line('Desde 1979', center: true),
      const _Line('--------------------------------'),
      _Line('PEDIDO #${order.orderNumber}', bold: true, center: true),
      _Line(order.barcode, center: true),
      const _Line('--------------------------------'),
    ];
    for (final item in order.items) {
      final value = (item.unitPrice * item.quantity).toStringAsFixed(2).replaceAll('.', ',');
      lines.add(_Line('${item.quantity}x ${item.productName}   R\$ $value', bold: true));
      if (item.notes.trim().isNotEmpty) {
        lines.add(_Line('  ${item.notes}'));
      }
    }
    lines.addAll([
      const _Line('--------------------------------'),
      _Line('TOTAL   R\$ ${order.total.toStringAsFixed(2).replaceAll('.', ',')}', bold: true),
      const _Line('--------------------------------'),
      const _Line('Obrigado pela preferencia!', center: true),
    ]);

    final paragraphs = <ui.Paragraph>[];
    var height = 16.0;
    for (final line in lines) {
      final paragraph = _paragraph(line);
      paragraphs.add(paragraph);
      height += paragraph.height + 6;
    }
    height += 16;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawRect(
      Rect.fromLTWH(0, 0, paperWidth.toDouble(), height),
      Paint()..color = const Color(0xFFFFFFFF),
    );
    var y = 8.0;
    for (final paragraph in paragraphs) {
      canvas.drawParagraph(paragraph, Offset(8, y));
      y += paragraph.height + 6;
    }
    final image = await recorder.endRecording().toImage(paperWidth, height.ceil());
    final pixels = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    if (pixels == null) throw PrinterException('Falha ao montar o cupom.');
    return _toRaster(pixels, paperWidth, height.ceil());
  }

  ui.Paragraph _paragraph(_Line line) {
    final builder = ui.ParagraphBuilder(
      ui.ParagraphStyle(
        fontSize: receiptFontSize,
        fontWeight: line.bold ? FontWeight.w700 : FontWeight.w400,
        textAlign: line.center ? TextAlign.center : TextAlign.left,
      ),
    )
      ..pushStyle(ui.TextStyle(
        color: const Color(0xFF000000),
        fontSize: receiptFontSize,
        fontWeight: line.bold ? FontWeight.w700 : FontWeight.w400,
      ))
      ..addText(line.text);
    return builder.build()..layout(ui.ParagraphConstraints(width: paperWidth - 16));
  }

  Uint8List _toRaster(ByteData pixels, int width, int height) {
    final widthBytes = (width + 7) ~/ 8;
    final data = Uint8List(widthBytes * height);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        final offset = (y * width + x) * 4;
        final shade = pixels.getUint8(offset) + pixels.getUint8(offset + 1) + pixels.getUint8(offset + 2);
        if (shade < 384) {
          data[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
    final header = Uint8List.fromList([
      0x1D,
      0x76,
      0x30,
      0x00,
      widthBytes & 0xFF,
      (widthBytes >> 8) & 0xFF,
      height & 0xFF,
      (height >> 8) & 0xFF,
    ]);
    return Uint8List.fromList([...header, ...data]);
  }
}

class _Line {
  const _Line(this.text, {this.bold = false, this.center = false});

  final String text;
  final bool bold;
  final bool center;
}
