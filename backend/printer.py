import ipaddress
import socket


def build_receipt(order_number: int, items: list, total: float, barcode: str, font_size: int) -> bytes:
    font_size = max(10, min(28, int(font_size)))
    scale = 1 if font_size < 16 else 2 if font_size < 24 else 3
    comanda_scale = min(8, scale * 3)

    def size(value: int) -> bytes:
        value = max(1, min(8, value))
        return bytes([0x1D, 0x21, (value - 1) | ((value - 1) << 4)])

    def line(text: str, *, bold: bool = False, center: bool = False, scale_value: int = scale) -> bytes:
        encoded = str(text).encode("cp850", errors="replace")
        align = b"\x1b\x61\x01" if center else b"\x1b\x61\x00"
        weight = b"\x1b\x45\x01" if bold else b"\x1b\x45\x00"
        return align + size(scale_value) + weight + encoded + b"\n"

    chunks = [b"\x1b\x40"]
    chunks.append(line("PASTELARIA CANASTRA", bold=True, center=True))
    chunks.append(line("Desde 1979", center=True))
    chunks.append(line("--------------------------------", center=True, scale_value=1))
    chunks.append(line("COMANDA", bold=True, center=True))
    chunks.append(line(str(order_number), bold=True, center=True, scale_value=comanda_scale))
    chunks.append(line(barcode, center=True, scale_value=1))
    chunks.append(line("--------------------------------", center=True, scale_value=1))
    for item in items:
        quantity = int(item["quantity"])
        name = str(item.get("product_name") or "")
        value = f"{float(item['unit_price']) * quantity:.2f}".replace(".", ",")
        chunks.append(line(f"{quantity}x {name}   R$ {value}", bold=True))
        notes = str(item.get("notes") or "").strip()
        if notes:
            chunks.append(line(f"  {notes}"))
    total_text = f"{float(total):.2f}".replace(".", ",")
    chunks.append(line("--------------------------------", center=True, scale_value=1))
    chunks.append(line(f"TOTAL   R$ {total_text}", bold=True))
    chunks.append(line("--------------------------------", center=True, scale_value=1))
    chunks.append(line("Obrigado pela preferencia!", center=True))
    chunks.append(b"\x1b\x64\x04")
    chunks.append(b"\x1d\x56\x42\x00")
    return b"".join(chunks)


def local_printer_ip(value: str) -> str:
    try:
        address = ipaddress.ip_address(str(value).strip())
    except ValueError as error:
        raise ValueError("IP da impressora inválido") from error
    if not (address.is_private or address.is_loopback):
        raise ValueError("Use o IP local da impressora")
    return str(address)


def send_to_printer(ip: str, port: int, payload: bytes) -> None:
    host = local_printer_ip(ip)
    if not isinstance(port, int) or isinstance(port, bool) or port < 1 or port > 65535:
        raise ValueError("Porta da impressora inválida")
    try:
        with socket.create_connection((host, port), timeout=5) as sock:
            sock.sendall(payload)
    except TimeoutError as error:
        raise OSError(f"A impressora {host}:{port} não respondeu.") from error
    except OSError as error:
        raise OSError(f"Não foi possível falar com a impressora em {host}:{port}. {error}") from error
