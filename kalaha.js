// import { Board } from './board.js';
// import { BoardView } from './boardview.js';
// import { StoneView } from './stoneview.js';
  
const dummyStones = Array.from(document.querySelectorAll('.stone.dummy'));
const realStones = Array.from(document.querySelectorAll('.stone.real'));
const houses = Array.from(document.querySelectorAll('.house'));
const stores = Array.from(document.querySelectorAll('.store'));

const p0Name = document.querySelector('.player0');
const p1Name = document.querySelector('.player1');
const messageText = document.querySelector('.message .text');
const refreshButton = document.querySelector('button.refresh');

realStones.forEach(s => s.classList.add([
    'red', 'green', 'yellow',
    'blue', 'purple', 'cyan'
][Math.floor(Math.random() * 6)]));

const stoneViews = realStones.map((realStone, i) => new StoneView(dummyStones[i], realStone));
let boardView = new BoardView(stoneViews, houses, stores);

window.addEventListener('resize', () => boardView.render());

resetGame();

houses.forEach((houseView, slotIdx) => {
    houseView.addEventListener('click', _ => {
        const moveResult = board.move(slotIdx, player);
        if (moveResult === null) {
            return; // invalid move
        }

        const [boardDistribute, boardPickup] = moveResult;
        boardView.render(boardDistribute.state).then(() => boardView.render(boardPickup.state));
        board = boardPickup;

        player = (player + 1) % 2;
        setPlayer(player);

        if (!board.canMove(player)) {
            const p0Score = board.playerScore(0);
            const p1Score = board.playerScore(1);
            if (p0Score > p1Score) {
                messageText.innerHTML = `${p0Name.innerHTML} wins with ${p0Score} &mdash; ${p1Score}.`;
            } else if (p1Score > p0Score) {
                messageText.innerHTML = `${p1Name.innerHTML} wins with ${p1Score} &mdash; ${p0Score}.`;
            } else {
                messageText.innerHTML = `The game is drawn at ${p0Score} each! Another one?`;
            }
        }
    });
});

document.querySelector('button.refresh').addEventListener('click', () => {
    resetGame();
});

function resetGame() {
    board = new Board();
    boardView.render(board.state);
    player = 0;
    setPlayer(player);
}

function setPlayer(player) {
    boardView.setPlayer(player);
    messageText.innerHTML = `${player ? p1Name.innerHTML : p0Name.innerHTML}, your turn.`
}
