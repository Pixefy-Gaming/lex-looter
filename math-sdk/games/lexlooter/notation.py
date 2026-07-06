"""Board notation helpers for Lex Looter.

Rows are bottom-origin like chess: A1 is bottom-left, AN25 is top-right.
Canvas pixels are top-origin, so y conversion is inverted.
"""

BOARD_COLS = 40
BOARD_ROWS = 25
CELL_SIZE = 20
CANVAS_WIDTH = BOARD_COLS * CELL_SIZE
CANVAS_HEIGHT = BOARD_ROWS * CELL_SIZE

CORNER_NOTATION = {
    "tl": "A25",
    "tr": "AN25",
    "bl": "A1",
    "br": "AN1",
}


def col_to_label(col: int) -> str:
    if col < 0:
        raise ValueError(f"Column out of range: {col}")

    label = ""
    value = col
    while True:
        label = chr(ord("A") + (value % 26)) + label
        value = value // 26 - 1
        if value < 0:
            return label


def label_to_col(label: str) -> int:
    if not label or not label.isalpha():
        raise ValueError(f"Invalid column label: {label}")

    value = 0
    for char in label.upper():
        value = value * 26 + (ord(char) - ord("A") + 1)
    return value - 1


def cell_to_notation(col: int, row: int) -> str:
    if col < 0 or col >= BOARD_COLS or row < 0 or row >= BOARD_ROWS:
        raise ValueError(f"Cell out of range: col={col}, row={row}")
    return f"{col_to_label(col)}{row + 1}"


def notation_to_cell(notation: str) -> dict:
    letters = "".join(char for char in notation if char.isalpha())
    numbers = "".join(char for char in notation if char.isdigit())
    if not letters or not numbers:
        raise ValueError(f"Invalid notation: {notation}")

    col = label_to_col(letters)
    row = int(numbers) - 1
    if col < 0 or col >= BOARD_COLS or row < 0 or row >= BOARD_ROWS:
        raise ValueError(f"Notation out of range: {notation}")
    return {"col": col, "row": row}


def cell_to_pixel_center(col: int, row: int) -> dict:
    return {
        "x": (col + 0.5) * CELL_SIZE,
        "y": CANVAS_HEIGHT - (row + 0.5) * CELL_SIZE,
    }


def pixel_to_notation(x: float, y: float) -> str:
    col = min(max(int(x // CELL_SIZE), 0), BOARD_COLS - 1)
    row = min(max(int((CANVAS_HEIGHT - y) // CELL_SIZE), 0), BOARD_ROWS - 1)
    return cell_to_notation(col, row)


def notation_to_normalized(notation: str) -> tuple[float, float]:
    cell = notation_to_cell(notation)
    pixel = cell_to_pixel_center(cell["col"], cell["row"])
    return (
        round(pixel["x"] / CANVAS_WIDTH, 4),
        round(pixel["y"] / CANVAS_HEIGHT, 4),
    )


def board_payload() -> dict:
    return {
        "cols": BOARD_COLS,
        "rows": BOARD_ROWS,
        "cellSize": CELL_SIZE,
        "width": CANVAS_WIDTH,
        "height": CANVAS_HEIGHT,
        "corners": CORNER_NOTATION,
    }
