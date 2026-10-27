import { api } from "@/api/client";
import { loadSettings } from "@/lib/settings";

export async function printOrder(order) {
  const settings = loadSettings();
  if (!settings.printerIp) {
    throw new Error("Informe o IP da impressora nas configurações.");
  }
  await api.orders.print({
    printer_ip: settings.printerIp,
    printer_port: settings.printerPort,
    font_size: settings.printFontSize,
    order_number: order.order_number,
    items: order.items,
    total: order.total,
    barcode: order.barcode,
  });
}
