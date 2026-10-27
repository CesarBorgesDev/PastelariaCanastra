import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  AppSettings({
    required this.backendUrl,
    required this.printerIp,
    required this.printerPort,
    required this.printFontSize,
    required this.cardsPerRow,
    required this.descriptionFontSize,
  });

  final String backendUrl;
  final String printerIp;
  final int printerPort;
  final int printFontSize;
  final int cardsPerRow;
  final int descriptionFontSize;

  bool get hasBackend => backendUrl.trim().isNotEmpty;
  bool get hasPrinter => printerIp.trim().isNotEmpty;

  static const backendUrlDefault = 'http://127.0.0.1';
  static const printerPortDefault = 9100;
  static const printFontSizeDefault = 14;
  static const printFontSizeMin = 10;
  static const printFontSizeMax = 28;
  static const cardsPerRowDefault = 5;
  static const cardsPerRowMin = 2;
  static const cardsPerRowMax = 8;
  static const descriptionFontSizeDefault = 16;
  static const descriptionFontSizeMin = 12;
  static const descriptionFontSizeMax = 28;

  static Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    final storedSize = prefs.getInt('print_font_size') ?? printFontSizeDefault;
    final fontSize = storedSize.clamp(printFontSizeMin, printFontSizeMax);
    final storedColumns = prefs.getInt('cards_per_row') ?? cardsPerRowDefault;
    final storedDescription = prefs.getInt('description_font_size') ?? descriptionFontSizeDefault;
    final storedBackend = (prefs.getString('backend_url') ?? '').trim();
    return AppSettings(
      backendUrl: storedBackend.isEmpty ? backendUrlDefault : storedBackend,
      printerIp: prefs.getString('printer_ip') ?? '',
      printerPort: prefs.getInt('printer_port') ?? printerPortDefault,
      printFontSize: fontSize,
      cardsPerRow: storedColumns.clamp(cardsPerRowMin, cardsPerRowMax),
      descriptionFontSize: storedDescription.clamp(descriptionFontSizeMin, descriptionFontSizeMax),
    );
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('backend_url', backendUrl.trim());
    await prefs.setString('printer_ip', printerIp.trim());
    await prefs.setInt('printer_port', printerPort);
    await prefs.setInt('print_font_size', printFontSize.clamp(printFontSizeMin, printFontSizeMax));
    await prefs.setInt('cards_per_row', cardsPerRow.clamp(cardsPerRowMin, cardsPerRowMax));
    await prefs.setInt('description_font_size', descriptionFontSize.clamp(descriptionFontSizeMin, descriptionFontSizeMax));
  }
}
