import json
import os
import re
import time
import unicodedata
from pathlib import Path
from urllib.parse import quote_plus

import psycopg
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from psycopg.types.json import Json

CATEGORIES = ["Pastéis Salgados", "Pastéis Doces", "Bebidas", "Adicionais"]
CATEGORY_HINTS = [
    ("salgad", "Pastéis Salgados"),
    ("doce", "Pastéis Doces"),
    ("bebid", "Bebidas"),
    ("adicion", "Adicionais"),
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
        conn.execute(schema)
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


def require_uuid(value: str) -> None:
    if not UUID_RE.match(value):
        raise HTTPException(status_code=400, detail="Produto inválido")


@app.get("/api/health")
def health():
    with connect() as conn:
        conn.execute("SELECT 1")
    return {"ok": True, "service": "pastelaria-backend"}


@app.get("/api/products")
def list_products(available: str | None = None):
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
    return [map_product(row) for row in rows]


@app.post("/api/products", status_code=201)
def create_product(body: dict):
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
    return map_product(row)


@app.patch("/api/products/{product_id}")
def update_product(product_id: str, body: dict):
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
    return map_product(row)


@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: str):
    require_uuid(product_id)
    with connect() as conn:
        result = conn.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
    return Response(status_code=204)


@app.post("/api/orders", status_code=201)
def create_order(body: dict):
    order_number = body.get("order_number")
    items = body.get("items")
    barcode = body.get("barcode")
    try:
        total = float(body.get("total"))
    except (TypeError, ValueError):
        total = float("nan")
    if isinstance(order_number, bool) or not isinstance(order_number, int):
        raise HTTPException(status_code=400, detail="Pedido inválido")
    if not isinstance(items, list) or not items or total != total or total < 0:
        raise HTTPException(status_code=400, detail="Pedido inválido")
    if not isinstance(barcode, str) or not barcode.strip():
        raise HTTPException(status_code=400, detail="Pedido inválido")
    with connect() as conn:
        row = conn.execute(
            """
            INSERT INTO orders (order_number, items, total, status, barcode)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (order_number, Json(items), total, body.get("status") or "pendente", barcode.strip()),
        ).fetchone()
        conn.commit()
    return {"id": str(row["id"])}
