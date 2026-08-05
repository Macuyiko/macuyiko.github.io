const pixelSize = 6;
const tileSize = 3;
const gridWidth = 40;
const gridHeight = 40;

let grid = [];
let tiles = [];
let pattern;
let constraints = new Map();

const directions = [
    { dx: 1, dy: 0, dir: 'E' },
    { dx: -1, dy: 0, dir: 'W' },
    { dx: 0, dy: 1, dir: 'N' },
    { dx: 0, dy: -1, dir: 'S' },
];

function preload() {
    pattern = loadImage('pattern3.png');
}

function setup() {
    createCanvas((gridWidth+tileSize-1) * pixelSize, (gridHeight+tileSize-1) * pixelSize);
    noStroke();
    background(0);
    initializeTiles();
    initializeGrid();
    let button = createButton('Run again');
    button.mousePressed(function () {
        background(0);
        initializeTiles();
        initializeGrid();
    });
}

function draw() {
    drawGrid();
    if (!isGridComplete())
        collapseNextCell();
}


function initializeTiles() {
    let tileMap = new Map();
    let tileCoords = new Map();

    constraints = new Map();
    let tileId = 0;
    for (let y = 0; y < pattern.height - tileSize+1; y++) {
        for (let x = 0; x < pattern.width - tileSize+1; x++) {
            let tileData = [];
            for (let dy = 0; dy < tileSize; dy++) {
                for (let dx = 0; dx < tileSize; dx++) {
                    let sx = x + dx;
                    let sy = y + dy;
                    if (sx < 0) sx = pattern.width + sx;
                    if (sy < 0) sy = pattern.height + sy;
                    if (sx >= pattern.width) sx = sx - pattern.width;
                    if (sy >= pattern.height) sy = sy - pattern.height;
                    tileData.push(pattern.get(sx, sy));
                }
            }
            let tileString = JSON.stringify(tileData);
            if (!tileMap.has(tileString)) {
                tileMap.set(tileString, {
                    id: tileId,
                    data: tileData
                });
                tileId++;
            }
            let myId = tileMap.get(tileString).id;
            if (!tileCoords.has(myId))
                tileCoords.set(myId, new Set());
            tileCoords.get(myId).add({ x: x, y: y });
        }
    }
    tiles = Array.from(tileMap.values());
    for (let t1 of tiles) {
        if (!constraints.has(t1.id)) {
            constraints.set(t1.id, 
                { N: new Set(), E: new Set(), S: new Set(), W: new Set() }
            );
            for (let t2 of tiles) {
                for (let xy1 of tileCoords.get(t1.id)) {
                    for (let xy2 of tileCoords.get(t2.id)) {
                        for (let { dx, dy, dir } of directions) {
                            let sxyX = xy1.x + dx;
                            let sxyY = xy1.y + dy;
                            if (sxyX < 0) sxyX = gridWidth - 1;
                            if (sxyY < 0) sxyY = gridHeight - 1;
                            if (sxyY >= gridWidth) sxyX = 0;
                            if (sxyX >= gridHeight) sxyY = 0;
                            if (xy2.x == sxyX && xy2.y == sxyY) constraints.get(t1.id)[dir].add(t2.id);
                        }
                    }
                }
            }
        }
    }
    console.log(tiles);
    console.log(constraints);
}

function initializeGrid() {
    for (let y = 0; y < gridHeight; y++) {
        grid[y] = [];
        for (let x = 0; x < gridWidth; x++) {
            grid[y][x] = [...tiles];
        }
    }
}

function drawPixel(x, y, dx, dy, pixelColor) {
    let bx = x + dx;
    let by = y + dy;
    fill(pixelColor);
    rect(bx * pixelSize, by * pixelSize, pixelSize, pixelSize);
}

function drawGrid() {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x].length === 1) {
                let tile = grid[y][x][0];
                for (let dy = 0; dy < tileSize; dy++) {
                    for (let dx = 0; dx < tileSize; dx++) {
                        let pixelColor = tile.data[dy * tileSize + dx];
                        drawPixel(x, y, dx, dy, pixelColor);
                    }
                }
            } else {
                let cl = 255 * grid[y][x].length / tiles.length;
                for (let dy = 0; dy < tileSize; dy++)
                    for (let dx = 0; dx < tileSize; dx++)
                        drawPixel(x, y, dx, dy, color(cl, cl, cl));
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
    let stack = [{ x, y }];

    while (stack.length > 0) {
        let { x, y } = stack.pop();
        let currentTiles = grid[y][x]
        
        for (let { dx, dy, dir } of directions) {
            let newX = x + dx;
            let newY = y + dy;

            if (newX >= 0 && newX < gridWidth && newY >= 0 && newY < gridHeight) {
                let neighbor = grid[newY][newX];
                let oldLength = grid[newY][newX].length;
                if (oldLength <= 1) continue;
                grid[newY][newX] = neighbor.filter(tile => {
                    return currentTiles.some(currentTile => {
                        let myConstraints = constraints.get(currentTile.id);
                        if (!myConstraints) return true;
                        return myConstraints[dir].has(tile.id);
                    });
                });

                if (grid[newY][newX].length < oldLength) {
                    stack.push({ x: newX, y: newY });
                }
            }
        }
    }
}