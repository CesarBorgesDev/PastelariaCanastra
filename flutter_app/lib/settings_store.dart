import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  AppSettings({
    required this.backendUrl,
    required this.printerIp,
    required this.printerPort,
    required this.printFontSize,
  });

  final String backendUrl;
  final String printerIp;
  final int printerPort;
  final int printFontSize;

  bool get hasBackend => backendUrl.trim().isNotEmpty;
  bool get hasPrinter => printerIp.trim().isNotEmpty;

  static const printerPortDefault = 9100;
  static const printFontSizeDefault = 14;
  static const printFontSizeMin = 10;
  static const printFontSizeMax = 28;

  static Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    final storedSize = prefs.getInt('print_font_size') ?? printFontSizeDefault;
    final fontSize = storedSize.clamp(printFontSizeMin, printFontSizeMax);
    return AppSettings(
      backendUrl: prefs.getString('backend_url') ?? '',
      printerIp: prefs.getString('printer_ip') ?? '',
      printerPort: prefs.getInt('printer_port') ?? printerPortDefault,
      printFontSize: fontSize,
    );
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('backend_url', backendUrl.trim());
    await prefs.setString('printer_ip', printerIp.trim());
    await prefs.setInt('printer_port', printerPort);
    await prefs.setInt('print_font_size', printFontSize.clamp(printFontSizeMin, printFontSizeMax));
  }
}
