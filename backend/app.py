import json
import os
import re
import time
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote_plus, urlparse
from zoneinfo import ZoneInfo

import psycopg
from fastapi import FastAPI, HTTPException, Request
from psycopg.errors import UniqueViolation
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from psycopg.types.json import Json

from printer import build_receipt, send_to_printer

CATEGORIES = ["Pastéis Salgados", "Pastéis Doces", "Bebidas", "Adicionais"]
CATEGORY_HINTS = [
    ("salgad", "Pastéis Salgados"),
    ("doce", "Pastéis Doces"),
    ("bebid", "Bebidas"),
    ("adicion", "Adicionais"),
]
STORE_TZ = ZoneInfo("America/Sao_Paulo")
SEED_ATTENDANTS = [
    "ANA CLÁUDIA",
    "AUXILIADORA",
    "BRUNA",
    "EZEQUIEL",
    "FERNANDA",
    "GABI",
    "GREGÓRIO",
    "IGOR Aug.",
    "JENNY",
    "JÉSSICA",
    "KARINA",
    "MARQUINHO",
    "PACHECO",
    "PATRICK",
    "ROBERTA",
    "TAYNÁ",
    "AJUDANTE",
]
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", "/app/uploads"))
PRODUCTS_FILE = Path(os.environ.get("PRODUCTS_FILE", "/app/products.json"))
SCHEMA_FILE = Path(__file__).with_name("schema.sql")


def database_url() -> str:
    user = os.environ.get("POSTGRES_USER", "pastelaria")
    password = os.environ.get("POSTGRES_PASSWORD", "")
    host = os.environ.get("POSTGRES_HOST", "pastelaria-db")
    name = os.environ.get("POSTGRES_DB", "pastelaria")
    if not password:
        raise RuntimeError("POSTGRES_PASSWORD não definida")
    return (
        f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:5432/{quote_plus(name)}"
    )


def connect():
    return psycopg.connect(database_url(), row_factory=dict_row)


def repair_text(value) -> str:
    text = "" if value is None else str(value)
    if "Ã" not in text and "Â" not in text:
        return text
    fixed = text.encode("latin1").decode("utf-8")
    if "\ufffd" in fixed:
        return text
    return fixed


def canonical_category(value) -> str:
    text = repair_text(value).strip()
    folded = unicodedata.normalize("NFD", text)
    folded = "".join(char for char in folded if not unicodedata.combining(char)).lower()
    for hint, label in CATEGORY_HINTS:
        if hint in folded:
            return label
    return text


def map_product(row) -> dict:
    created = row["created_at"]
    return {
        "id": str(row["id"]),
        "name": repair_text(row["name"]),
        "description": repair_text(row["description"]),
        "price": float(row["price"]),
        "category": canonical_category(row["category"]),
        "image_url": row["image_url"] or "",
        "available": bool(row["available"]),
        "created_date": created.isoformat() if hasattr(created, "isoformat") else created,
    }


def _header_value(headers, name: str) -> str:
    value = headers.get(name, "")
    if value is None:
        return ""
    return str(value).split(",")[0].strip()


def _host_with_port(host: str, scheme: str) -> str:
    if host.startswith("["):
        bracket = host.find("]")
        if bracket == -1:
            return host
        name = host[: bracket + 1]
        rest = host[bracket + 1 :]
        port = rest[1:] if rest.startswith(":") else ""
    elif host.count(":") == 1:
        name, port = host.rsplit(":", 1)
        if not port.isdigit():
            return host
    else:
        return host
    if not port.isdigit():
        return host
    if (scheme == "http" and port == "80") or (scheme == "https" and port == "443"):
        return name
    return host


def public_origin(headers, scheme: str, netloc: str) -> str:
    forwarded_scheme = _header_value(headers, "x-forwarded-proto").lower()
    if forwarded_scheme not in {"http", "https"}:
        forwarded_scheme = scheme if scheme in {"http", "https"} else "http"
    host = _header_value(headers, "x-forwarded-host") or _header_value(headers, "host") or netloc
    return f"{forwarded_scheme}://{_host_with_port(host, forwarded_scheme)}"


def absolute_image_url(image_url: str, origin: str) -> str:
    raw = image_url.strip() if isinstance(image_url, str) else ""
    if not raw:
        return ""
    parsed = urlparse(raw)
    query = f"?{parsed.query}" if parsed.query else ""
    path = parsed.path or ""
    on_uploads = path == "/uploads" or path.startswith("/uploads/")
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        if on_uploads:
            return f"{origin}{path}{query}"
        return raw
    if raw.startswith("//"):
        if on_uploads:
            return f"{origin}{path}{query}"
        return raw
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{origin}{path}{query}"


def present_product(product: dict, request: Request) -> dict:
    shown = dict(product)
    shown["image_url"] = absolute_image_url(
        shown.get("image_url") or "",
        public_origin(request.headers, request.url.scheme, request.url.netloc),
    )
    return shown


def read_product(body: dict) -> dict:
    name = body.get("name") if isinstance(body.get("name"), str) else ""
    description = body.get("description") if isinstance(body.get("description"), str) else ""
    category = body.get("category") if isinstance(body.get("category"), str) else ""
    image_url = body.get("image_url") if isinstance(body.get("image_url"), str) else ""
    try:
        price = float(body.get("price"))
    except (TypeError, ValueError):
        price = float("nan")
    available = body.get("available") is not False
    category = canonical_category(category)
    if not name.strip() or price != price or price < 0 or category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Preencha nome, preço e categoria válidos")
    return {
        "name": repair_text(name).strip(),
        "description": repair_text(description).strip(),
        "price": price,
        "category": category,
        "image_url": image_url.strip(),
        "available": available,
    }


def init_db() -> None:
    last_error = None
    for _ in range(30):
        try:
            with connect() as conn:
                conn.execute("SELECT 1")
            last_error = None
            break
        except Exception as error:
            last_error = error
            time.sleep(1)
    if last_error:
        raise last_error

    schema = SCHEMA_FILE.read_text(encoding="utf-8")
    with connect() as conn:
        for statement in schema.split(";"):
            sql = statement.strip()
            if sql:
                conn.execute(sql)
        count = conn.execute("SELECT COUNT(*) AS count FROM products").fetchone()["count"]
        if count == 0 and PRODUCTS_FILE.is_file():
            products = json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
            for product in products:
                payload = read_product(product)
                conn.execute(
                    """
                    INSERT INTO products (name, description, price, category, image_url, available)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        payload["name"],
                        payload["description"],
                        payload["price"],
                        payload["category"],
                        payload["image_url"],
                        payload["available"],
                    ),
                )
        rows = conn.execute("SELECT id, name, description, category FROM products").fetchall()
        for row in rows:
            name = repair_text(row["name"])
            description = repair_text(row["description"])
            category = canonical_category(row["category"])
            if name == row["name"] and description == row["description"] and category == row["category"]:
                continue
            conn.execute(
                "UPDATE products SET name = %s, description = %s, category = %s WHERE id = %s",
                (name, description, category, row["id"]),
            )
        attendant_count = conn.execute("SELECT COUNT(*) AS count FROM attendants").fetchone()["count"]
        if attendant_count == 0:
            for index, attendant_name in enumerate(SEED_ATTENDANTS, start=1):
                conn.execute(
                    "INSERT INTO attendants (name, sort_order) VALUES (%s, %s)",
                    (attendant_name, index),
                )
        conn.commit()


UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
init_db()

app = FastAPI(title="pastelaria-backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.exception_handler(HTTPException)
async def http_error(_request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Erro"
    return JSONResponse(status_code=exc.status_code, content={"error": detail})


@app.exception_handler(Exception)
async def unexpected_error(_request: Request, exc: Exception):
    print(exc)
    return JSONResponse(status_code=500, content={"error": "Erro interno"})


def require_uuid(value: str, detail: str = "Produto inválido") -> None:
    if not isinstance(value, str) or not UUID_RE.match(value):
        raise HTTPException(status_code=400, detail=detail)


@app.get("/api/health")
def health():
    with connect() as conn:
        conn.execute("SELECT 1")
    return {"ok": True, "service": "pastelaria-backend"}


@app.get("/api/products")
def list_products(request: Request, available: str | None = None):
    available_only = available == "true"
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM products
            WHERE (%s = FALSE OR available = TRUE)
            ORDER BY created_at DESC
            """,
            (available_only,),
        ).fetchall()
    return [present_product(map_product(row), request) for row in rows]


@app.post("/api/products", status_code=201)
def create_product(body: dict, request: Request):
    payload = read_product(body)
    with connect() as conn:
        row = conn.execute(
            """
            INSERT INTO products (name, description, price, category, image_url, available)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                payload["name"],
                payload["description"],
                payload["price"],
                payload["category"],
                payload["image_url"],
                payload["available"],
            ),
        ).fetchone()
        conn.commit()
    return present_product(map_product(row), request)


@app.patch("/api/products/{product_id}")
def update_product(product_id: str, body: dict, request: Request):
    require_uuid(product_id)
    with connect() as conn:
        current = conn.execute("SELECT * FROM products WHERE id = %s", (product_id,)).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        merged = map_product(current)
        merged.update(body)
        payload = read_product(merged)
        row = conn.execute(
            """
            UPDATE products
            SET name = %s, description = %s, price = %s, category = %s, image_url = %s, available = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                payload["name"],
                payload["description"],
                payload["price"],
                payload["category"],
                payload["image_url"],
                payload["available"],
                product_id,
            ),
        ).fetchone()
        conn.commit()
    return present_product(map_product(row), request)


@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: str):
    require_uuid(product_id)
    with connect() as conn:
        result = conn.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
    return Response(status_code=204)


def map_attendant(row) -> dict:
    return {
        "id": str(row["id"]),
        "name": repair_text(row["name"]),
        "active": bool(row["active"]),
        "sort_order": int(row["sort_order"]),
    }


def read_attendant_name(body: dict) -> str:
    name = body.get("name") if isinstance(body.get("name"), str) else ""
    name = repair_text(name).strip()
    if not name or len(name) > 80:
        raise HTTPException(status_code=400, detail="Informe o nome do atendente")
    return name


@app.get("/api/attendants")
def list_attendants(active: str | None = None):
    active_only = active == "true"
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM attendants
            WHERE (%s = FALSE OR active = TRUE)
            ORDER BY sort_order, name
            """,
            (active_only,),
        ).fetchall()
    return [map_attendant(row) for row in rows]


@app.post("/api/attendants", status_code=201)
def create_attendant(body: dict):
    name = read_attendant_name(body)
    active = body.get("active") is not False
    try:
        with connect() as conn:
            next_order = conn.execute(
                "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM attendants"
            ).fetchone()["next_order"]
            row = conn.execute(
                """
                INSERT INTO attendants (name, active, sort_order)
                VALUES (%s, %s, %s)
                RETURNING *
                """,
                (name, active, next_order),
            ).fetchone()
            conn.commit()
    except UniqueViolation:
        raise HTTPException(status_code=400, detail="Já existe um atendente com esse nome") from None
    return map_attendant(row)


@app.patch("/api/attendants/{attendant_id}")
def update_attendant(attendant_id: str, body: dict):
    require_uuid(attendant_id, "Atendente inválido")
    with connect() as conn:
        current = conn.execute("SELECT * FROM attendants WHERE id = %s", (attendant_id,)).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Atendente não encontrado")
        name = read_attendant_name({"name": body["name"]}) if "name" in body else current["name"]
        active = bool(body["active"]) if "active" in body else bool(current["active"])
        try:
            row = conn.execute(
                """
                UPDATE attendants
                SET name = %s, active = %s
                WHERE id = %s
                RETURNING *
                """,
                (name, active, attendant_id),
            ).fetchone()
            conn.commit()
        except UniqueViolation:
            raise HTTPException(status_code=400, detail="Já existe um atendente com esse nome") from None
    return map_attendant(row)


@app.delete("/api/attendants/{attendant_id}", status_code=204)
def delete_attendant(attendant_id: str):
    require_uuid(attendant_id, "Atendente inválido")
    with connect() as conn:
        result = conn.execute("DELETE FROM attendants WHERE id = %s", (attendant_id,))
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Atendente não encontrado")
    return Response(status_code=204)


def _order_items(body: dict) -> tuple[int | None, bool, str, list, float, str]:
    is_estufa = body.get("is_estufa") is True
    order_number = body.get("order_number")
    items = body.get("items")
    barcode = body.get("barcode")
    attendant_name = body.get("attendant_name") if isinstance(body.get("attendant_name"), str) else ""
    try:
        total = float(body.get("total"))
    except (TypeError, ValueError):
        total = float("nan")
    if is_estufa:
        order_number = None
    elif isinstance(order_number, bool) or not isinstance(order_number, int) or order_number < 1:
        raise HTTPException(status_code=400, detail="Informe o número da comanda")
    if not isinstance(items, list) or not items or total != total or total < 0:
        raise HTTPException(status_code=400, detail="Pedido inválido")
    if not isinstance(barcode, str) or not barcode.strip():
        raise HTTPException(status_code=400, detail="Pedido inválido")
    normalized = []
    for item in items:
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail="Pedido inválido")
        try:
            quantity = int(item.get("quantity"))
            unit_price = float(item.get("unit_price"))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Pedido inválido") from None
        name = item.get("product_name")
        if isinstance(quantity, bool) or quantity < 1 or unit_price != unit_price or unit_price < 0:
            raise HTTPException(status_code=400, detail="Pedido inválido")
        if not isinstance(name, str) or not name.strip():
            raise HTTPException(status_code=400, detail="Pedido inválido")
        notes = item.get("notes") if isinstance(item.get("notes"), str) else ""
        normalized.append({
            "product_name": name.strip(),
            "quantity": quantity,
            "unit_price": unit_price,
            "notes": notes,
        })
    return order_number, is_estufa, repair_text(attendant_name).strip(), normalized, total, barcode.strip()


def _summary_window(range_key: str) -> tuple[datetime, str, list[datetime]]:
    now = datetime.now(STORE_TZ)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if range_key == "7d":
        start = start_of_today - timedelta(days=6)
        buckets = [start + timedelta(days=offset) for offset in range(7)]
        return start, "day", buckets
    if range_key == "30d":
        start = start_of_today - timedelta(days=29)
        buckets = [start + timedelta(days=offset) for offset in range(30)]
        return start, "day", buckets
    if range_key != "today":
        raise HTTPException(status_code=400, detail="Período inválido")
    buckets = [start_of_today + timedelta(hours=hour) for hour in range(24)]
    return start_of_today, "hour", buckets


def _bucket_label(moment: datetime, kind: str) -> str:
    if kind == "hour":
        return moment.strftime("%H:%M")
    return moment.strftime("%d/%m")


@app.post("/api/orders", status_code=201)
def create_order(body: dict):
    attendant_id = body.get("attendant_id")
    require_uuid(attendant_id, "Selecione um atendente")
    order_number, is_estufa, _ignored_name, items, total, barcode = _order_items(body)
    with connect() as conn:
        attendant = conn.execute(
            "SELECT id, name, active FROM attendants WHERE id = %s",
            (attendant_id,),
        ).fetchone()
        if attendant is None or not attendant["active"]:
            raise HTTPException(status_code=400, detail="Selecione um atendente ativo")
        row = conn.execute(
            """
            INSERT INTO orders (
              order_number, items, total, status, barcode, attendant_id, attendant_name, is_estufa
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                order_number,
                Json(items),
                total,
                body.get("status") or "pendente",
                barcode,
                attendant["id"],
                repair_text(attendant["name"]),
                is_estufa,
            ),
        ).fetchone()
        conn.commit()
    return {
        "id": str(row["id"]),
        "order_number": order_number,
        "is_estufa": is_estufa,
        "attendant_id": str(attendant["id"]),
        "attendant_name": repair_text(attendant["name"]),
    }


@app.get("/api/orders/summary")
def orders_summary(range: str = "today"):
    start, kind, buckets = _summary_window(range)
    start_utc = start.astimezone(ZoneInfo("UTC"))
    with connect() as conn:
        totals = conn.execute(
            """
            SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS revenue
            FROM orders
            WHERE created_at >= %s
            """,
            (start_utc,),
        ).fetchone()
        timeline_rows = conn.execute(
            """
            SELECT date_trunc(%s, created_at AT TIME ZONE 'America/Sao_Paulo') AS bucket,
                   COUNT(*) AS count
            FROM orders
            WHERE created_at >= %s
            GROUP BY bucket
            ORDER BY bucket
            """,
            (kind, start_utc),
        ).fetchall()
        attendant_rows = conn.execute(
            """
            SELECT COALESCE(a.name, NULLIF(o.attendant_name, ''), 'Sem atendente') AS name,
                   COUNT(*) AS count,
                   COALESCE(SUM(o.total), 0) AS revenue
            FROM orders o
            LEFT JOIN attendants a ON a.id = o.attendant_id
            WHERE o.created_at >= %s
            GROUP BY 1
            ORDER BY count DESC, name
            """,
            (start_utc,),
        ).fetchall()
        recent_rows = conn.execute(
            """
            SELECT id, order_number, is_estufa, attendant_name, total, created_at
            FROM orders
            WHERE created_at >= %s
            ORDER BY created_at DESC
            LIMIT 40
            """,
            (start_utc,),
        ).fetchall()

    counts = {}
    for row in timeline_rows:
        bucket = row["bucket"]
        if bucket.tzinfo is None:
            bucket = bucket.replace(tzinfo=STORE_TZ)
        else:
            bucket = bucket.astimezone(STORE_TZ)
        counts[bucket.replace(minute=0, second=0, microsecond=0) if kind == "hour" else bucket.replace(hour=0, minute=0, second=0, microsecond=0)] = int(row["count"])

    timeline = []
    for bucket in buckets:
        key = bucket.replace(minute=0, second=0, microsecond=0) if kind == "hour" else bucket
        timeline.append({"label": _bucket_label(bucket, kind), "count": counts.get(key, 0)})

    recent = []
    for row in recent_rows:
        created = row["created_at"]
        if hasattr(created, "astimezone"):
            created = created.astimezone(STORE_TZ)
        recent.append({
            "id": str(row["id"]),
            "order_number": row["order_number"],
            "is_estufa": bool(row["is_estufa"]),
            "attendant_name": repair_text(row["attendant_name"]),
            "total": float(row["total"]),
            "created_at": created.isoformat() if hasattr(created, "isoformat") else created,
        })

    return {
        "range": range,
        "order_count": int(totals["order_count"]),
        "revenue": float(totals["revenue"]),
        "timeline": timeline,
        "by_attendant": [
            {
                "name": repair_text(row["name"]),
                "count": int(row["count"]),
                "revenue": float(row["revenue"]),
            }
            for row in attendant_rows
        ],
        "recent": recent,
    }


@app.post("/api/print", status_code=204)
def print_order(body: dict):
    order_number, is_estufa, attendant_name, items, total, barcode = _order_items(body)
    printer_ip = body.get("printer_ip")
    printer_port = body.get("printer_port", 9100)
    font_size = body.get("font_size", 14)
    if not isinstance(printer_ip, str) or not printer_ip.strip():
        raise HTTPException(status_code=400, detail="Informe o IP da impressora")
    if isinstance(printer_port, bool) or not isinstance(printer_port, int):
        raise HTTPException(status_code=400, detail="Porta da impressora inválida")
    if isinstance(font_size, bool) or not isinstance(font_size, int):
        raise HTTPException(status_code=400, detail="Tamanho da fonte inválido")
    try:
        payload = build_receipt(
            order_number,
            items,
            total,
            barcode,
            font_size,
            attendant_name,
            is_estufa,
        )
        send_to_printer(printer_ip, printer_port, payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except OSError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return Response(status_code=204)
