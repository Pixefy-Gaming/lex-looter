export const BOARD_COLS = 40;
export const BOARD_ROWS = 25;
export const CELL_SIZE = 20;
export const CANVAS_WIDTH = BOARD_COLS * CELL_SIZE;
export const CANVAS_HEIGHT = BOARD_ROWS * CELL_SIZE;

export type BoardCell = {
	col: number;
	row: number;
};

export type PixelPoint = {
	x: number;
	y: number;
};

export const CORNER_NOTATION = {
	tl: 'A25',
	tr: 'AN25',
	bl: 'A1',
	br: 'AN1',
} as const;

export const colToLabel = (col: number) => {
	if (col < 0) throw new Error(`Column out of range: ${col}`);
	let label = '';
	let value = col;
	while (true) {
		label = String.fromCharCode('A'.charCodeAt(0) + (value % 26)) + label;
		value = Math.floor(value / 26) - 1;
		if (value < 0) return label;
	}
};

export const labelToCol = (label: string) => {
	if (!/^[a-z]+$/i.test(label)) throw new Error(`Invalid column label: ${label}`);
	return [...label.toUpperCase()].reduce(
		(total, char) => total * 26 + (char.charCodeAt(0) - 'A'.charCodeAt(0) + 1),
		0,
	) - 1;
};

export const cellToNotation = ({ col, row }: BoardCell) => {
	if (col < 0 || col >= BOARD_COLS || row < 0 || row >= BOARD_ROWS) {
		throw new Error(`Cell out of range: ${col}, ${row}`);
	}
	return `${colToLabel(col)}${row + 1}`;
};

export const notationToCell = (notation: string): BoardCell => {
	const match = notation.match(/^([a-z]+)(\d+)$/i);
	if (!match) throw new Error(`Invalid notation: ${notation}`);
	const col = labelToCol(match[1]);
	const row = Number(match[2]) - 1;
	if (col < 0 || col >= BOARD_COLS || row < 0 || row >= BOARD_ROWS) {
		throw new Error(`Notation out of range: ${notation}`);
	}
	return { col, row };
};

export const cellToPixelCenter = ({ col, row }: BoardCell): PixelPoint => ({
	x: (col + 0.5) * CELL_SIZE,
	y: CANVAS_HEIGHT - (row + 0.5) * CELL_SIZE,
});

export const notationToPixelCenter = (notation: string): PixelPoint =>
	cellToPixelCenter(notationToCell(notation));

export const pixelToNotation = ({ x, y }: PixelPoint) =>
	cellToNotation({
		col: Math.min(Math.max(Math.floor(x / CELL_SIZE), 0), BOARD_COLS - 1),
		row: Math.min(Math.max(Math.floor((CANVAS_HEIGHT - y) / CELL_SIZE), 0), BOARD_ROWS - 1),
	});
