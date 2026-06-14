const PIECES = [
    { id: 0, color: 'var(--color-red)', cells: [[0,0], [1,0], [0,1], [1,1]] },
    { id: 1, color: 'var(--color-blue)', cells: [[0,0], [1,0], [2,0], [1,1]] },
    { id: 2, color: 'var(--color-green)', cells: [[0,0], [0,1], [0,2], [1,2]] },
    { id: 3, color: 'var(--color-yellow)', cells: [[1,0], [0,1], [1,1]] },
    { id: 4, color: 'var(--color-purple)', cells: [[0,0], [1,0]] },
    { id: 5, color: 'var(--color-cyan)', cells: [[0,0], [0,1]] }
];

const LEVELS = [
    {
        board: [
            [4,7,0,0,7],
            [4,7,0,0,7],
            [1,2,2,2,7],
            [1,1,3,2,7],
            [1,3,3,5,5]
        ]
    },
    {
        board: [
            [7,4,0,0,7],
            [7,4,0,0,7],
            [1,2,2,2,7],
            [1,1,3,2,7],
            [1,3,3,5,5]
        ]
    },
    {
        board: [
            [5,5,0,0,4],
            [7,7,0,0,4],
            [1,2,2,2,7],
            [1,1,3,2,7],
            [1,3,3,7,7]
        ]
    }
];

let currentLevelIndex = 0;
let boardState = Array(5).fill().map(() => Array(5).fill(-1));
let draggedPiece = null;
let offsetX = 0, offsetY = 0;
let isDragging = false;

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('level-select').addEventListener('change', (e) => {
        currentLevelIndex = parseInt(e.target.value);
        loadLevel();
    });

    loadLevel();
    
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    
    document.getElementById('restart-btn').addEventListener('click', resetGame);
});

function loadLevel() {
    isDragging = false;
    if(draggedPiece) {
        draggedPiece.remove();
        draggedPiece = null;
    }

    const boardDOM = document.getElementById('game-board');
    boardDOM.innerHTML = '';
    
    boardState = Array(5).fill().map(() => Array(5).fill(-1));
    const targetGrid = LEVELS[currentLevelIndex].board;
    
    for(let r=0; r<5; r++) {
        for(let c=0; c<5; c++) {
            if(targetGrid[r][c] === 7) {
                boardState[r][c] = 7;
                let brick = document.createElement('div');
                brick.className = 'brick-cell';
                brick.style.left = `calc(${c} * var(--cell-size-main))`;
                brick.style.top = `calc(${r} * var(--cell-size-main))`;
                boardDOM.appendChild(brick);
            }
        }
    }
    
    initPieces();
}

function initPieces() {
    const trayDOM = document.getElementById('pieces-tray');
    trayDOM.innerHTML = '';
    PIECES.forEach(p => {
        let pieceDOM = document.createElement('div');
        pieceDOM.className = 'piece';
        pieceDOM.dataset.id = p.id;
        
        // Calculate bounding box width/height in cells
        let maxX = Math.max(...p.cells.map(c => c[0]));
        let maxY = Math.max(...p.cells.map(c => c[1]));
        pieceDOM.style.width = `calc(${maxX + 1} * var(--cell-size-main))`;
        pieceDOM.style.height = `calc(${maxY + 1} * var(--cell-size-main))`;
        
        p.cells.forEach(cell => {
            let cellDOM = document.createElement('div');
            cellDOM.className = 'piece-cell';
            cellDOM.style.left = `calc(${cell[0]} * var(--cell-size-main))`;
            cellDOM.style.top = `calc(${cell[1]} * var(--cell-size-main))`;
            cellDOM.style.backgroundColor = p.color;
            pieceDOM.appendChild(cellDOM);
        });
        
        trayDOM.appendChild(pieceDOM);
    });
}

function onPointerDown(e) {
    if(e.button !== 0 && e.type === 'mousedown') return; // only left click
    const pieceNode = e.target.closest('.piece');
    if (!pieceNode) return;
    
    draggedPiece = pieceNode;
    isDragging = true;
    
    // Remove from board logical state if it was already placed
    removeFromBoard(parseInt(draggedPiece.dataset.id));
    
    // Calculate initial offset inside the element
    const rect = draggedPiece.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // Append to body and make fixed for smooth dragging over everything
    document.body.appendChild(draggedPiece);
    draggedPiece.classList.add('dragging');
    draggedPiece.style.position = 'fixed';
    draggedPiece.style.left = e.clientX - offsetX + 'px';
    draggedPiece.style.top = e.clientY - offsetY + 'px';
    
    // Force DOM update and disable hover transform logic briefly so calculation is clean later
    draggedPiece.style.transform = 'none';
    
    // Prevent default to avoid extra touch/mouse ghost events
    if(e.type === 'touchstart') e.preventDefault();
}

function onPointerMove(e) {
    if (!isDragging || !draggedPiece) return;
    draggedPiece.style.left = e.clientX - offsetX + 'px';
    draggedPiece.style.top = e.clientY - offsetY + 'px';
}

function onPointerUp(e) {
    if (!isDragging || !draggedPiece) return;
    
    // Temporarily reset any CSS transforms to accurately measure the bounds
    draggedPiece.style.transform = 'scale(1)';
    const pieceRect = draggedPiece.getBoundingClientRect();
    const boardDOM = document.getElementById('game-board');
    const boardRect = boardDOM.getBoundingClientRect();
    
    // Determine exact pixel size of one cell dynamically
    const cellDOM = document.createElement('div');
    cellDOM.style.width = 'var(--cell-size-main)';
    document.body.appendChild(cellDOM);
    const cellSize = cellDOM.getBoundingClientRect().width;
    document.body.removeChild(cellDOM);
    
    // Calculate position relative to board container
    const relX = pieceRect.left - boardRect.left;
    const relY = pieceRect.top - boardRect.top;
    
    const col = Math.round(relX / cellSize);
    const row = Math.round(relY / cellSize);
    
    const pieceId = parseInt(draggedPiece.dataset.id);
    const pieceDef = PIECES[pieceId];
    
    // Clean up drag states
    draggedPiece.classList.remove('dragging');
    draggedPiece.style.transform = ''; // give control back to CSS
    
    if (canPlace(pieceDef, col, row)) {
        placeOnBoard(draggedPiece, pieceDef, col, row);
    } else {
        returnToTray(draggedPiece);
    }
    
    draggedPiece = null;
    isDragging = false;
    
    checkWinCondition();
}

function canPlace(pieceDef, col, row) {
    // If it's too far from the board, don't even check grid
    if(col < -5 || col > 5 || row < -5 || row > 5) return false;
    
    for(let cell of pieceDef.cells) {
        let c = col + cell[0];
        let r = row + cell[1];
        if (c < 0 || c >= 5 || r < 0 || r >= 5) return false; // out of bounds
        if (boardState[r][c] !== -1) return false; // collision
    }
    return true;
}

function placeOnBoard(pieceDOM, pieceDef, col, row) {
    const boardDOM = document.getElementById('game-board');
    boardDOM.appendChild(pieceDOM);
    
    for(let cell of pieceDef.cells) {
        boardState[row + cell[1]][col + cell[0]] = pieceDef.id;
    }
    
    pieceDOM.style.position = 'absolute';
    pieceDOM.style.left = `calc(${col} * var(--cell-size-main))`;
    pieceDOM.style.top = `calc(${row} * var(--cell-size-main))`;
}

function returnToTray(pieceDOM) {
    const trayDOM = document.getElementById('pieces-tray');
    trayDOM.appendChild(pieceDOM);
    pieceDOM.style.position = 'relative';
    pieceDOM.style.left = '';
    pieceDOM.style.top = '';
}

function removeFromBoard(pieceId) {
    for(let r=0; r<5; r++) {
        for(let c=0; c<5; c++) {
            if(boardState[r][c] === pieceId) {
                boardState[r][c] = -1;
            }
        }
    }
}

function checkWinCondition() {
    let isWin = true;
    for(let r=0; r<5; r++) {
        for(let c=0; c<5; c++) {
            if(boardState[r][c] === -1) {
                isWin = false;
                break;
            }
        }
        if(!isWin) break;
    }
    
    if(isWin) {
        setTimeout(() => {
            document.getElementById('victory-modal').classList.remove('hidden');
        }, 300);
    }
}

function resetGame() {
    document.getElementById('victory-modal').classList.add('hidden');
    loadLevel();
}
