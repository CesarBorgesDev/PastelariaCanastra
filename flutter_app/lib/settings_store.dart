import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  AppSettings({required this.backendUrl, required this.printerIp, required this.printerPort});

  final String backendUrl;
  final String printerIp;
  final int printerPort;

  bool get hasBackend => backendUrl.trim().isNotEmpty;
  bool get hasPrinter => printerIp.trim().isNotEmpty;

  static const printerPortDefault = 9100;

  static Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    return AppSettings(
      backendUrl: prefs.getString('backend_url') ?? '',
      printerIp: prefs.getString('printer_ip') ?? '',
      printerPort: prefs.getInt('printer_port') ?? printerPortDefault,
    );
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('backend_url', backendUrl.trim());
    await prefs.setString('printer_ip', printerIp.trim());
    await prefs.setInt('printer_port', printerPort);
  }
}
