const tileSize = 20;
const gridWidth = 30;
const gridHeight = 30;

let grid = [];
let tiles = [];

function setup() {
    createCanvas(gridWidth * tileSize, gridHeight * tileSize);
    initializeTiles();
    initializeGrid();
    let button = createButton('Run again');
    button.mousePressed(function() {
        initializeTiles();
        initializeGrid();
    });
}

function draw() {
    background(0);
    drawGrid();
    if (!isGridComplete())
        collapseNextCell();
}

function initializeTiles() {
    tiles = [
        { id: 'water', color: color(150, 221, 235) },
        { id: 'beach', color: color(235, 158, 52) },
        { id: 'land', color: color(0, 161, 67) },
        { id: 'mountain', color: color(235, 235, 235) },
    ];
}

function initializeGrid() {
    for (let y = 0; y < gridHeight; y++) {
        grid[y] = [];
        for (let x = 0; x < gridWidth; x++) {
            grid[y][x] = [...tiles];
        }
    }
}

function drawGrid() {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x].length === 1) {
                fill(grid[y][x][0].color);
                rect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
}

function isGridComplete() {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x].length > 1) return false;
        }
    }
    return true;
}

function collapseNextCell() {
    let minEntropy = Infinity;
    let cellsWithMinEntropy = [];

    // Find cells with minimum entropy
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x].length > 1 && grid[y][x].length <= minEntropy) {
                if (grid[y][x].length < minEntropy) {
                    minEntropy = grid[y][x].length;
                    cellsWithMinEntropy = [];
                }
                cellsWithMinEntropy.push({ x, y });
            }
        }
    }

    if (cellsWithMinEntropy.length > 0) {
        let { x, y } = random(cellsWithMinEntropy);
        grid[y][x] = [random(grid[y][x])];
        propagateConstraints(x, y);
    }
}

function propagateConstraints(x, y) {
    const directions = [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }];
    let stack = [{ x, y }];

    while (stack.length > 0) {
        let { x, y } = stack.pop();
        let currentTiles = grid[y][x]

        for (let { dx, dy } of directions) {
            let newX = x + dx;
            let newY = y + dy;

            if (newX >= 0 && newX < gridWidth && newY >= 0 && newY < gridHeight) {
                let oldLength = grid[newY][newX].length;
                grid[newY][newX] = grid[newY][newX].filter(
                    function (tile) {
                        return currentTiles.some(function(currentTile) {
                            if (tile.id == 'water') return ['water', 'beach'].includes(currentTile.id);
                            if (tile.id == 'beach') return ['water', 'beach', 'land'].includes(currentTile.id);
                            if (tile.id == 'land') return ['beach', 'land', 'mountain'].includes(currentTile.id);
                            if (tile.id == 'mountain') return ['land', 'mountain'].includes(currentTile.id);
                        });
                    }
                );

                if (grid[newY][newX].length < oldLength) {
                    stack.push({ x: newX, y: newY });
                }
            }
        }
    }
}