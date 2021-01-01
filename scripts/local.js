// import { Kalaha } from './kalaha.js';
// import { KalahaBoard } from './kalahaboard.js';

let p0Name = () => (document.querySelector('.player0').value || 'Left');
let p1Name = () => (document.querySelector('.player1').value || 'Right');
const messageText = document.querySelector('.message');
const refreshButton = document.querySelector('button.refresh');
const boardView = new KalahaBoard(document.querySelector('.board-wrapper'));

window.addEventListener('resize', () => boardView.render());

function activePlayer(player) {
    boardView.activatePlayer(player);
    boardView.inactivatePlayer((player + 1) % 2);
    messageText.innerHTML = `${player ? p1Name() : p0Name()}, your turn.`
}

function resetGame(board=new Kalaha(), player=0) {
    gameState = {
        board: board,
        player: player,
    };
    activePlayer(gameState.player);
    boardView.render(gameState.board.state);
}

resetGame();
history.pushState(gameState, document.title);

boardView.houses.forEach((houseView, slotIdx) => {
    houseView.addEventListener('click', _ => {
        const moveResult = gameState.board.move(slotIdx, gameState.player);
        if (moveResult === null) {
            return; // invalid move
        }

        const [boardDistribute, boardPickup] = moveResult;
        boardView.render(boardDistribute.state).then(() => boardView.render(boardPickup.state));

        gameState.board = boardPickup;
        gameState.player = (gameState.player + 1) % 2;
        history.pushState(gameState, document.title);
        activePlayer(gameState.player);

        if (!gameState.board.canMove(gameState.player)) {
            const p0Score = gameState.board.playerScore(0);
            const p1Score = gameState.board.playerScore(1);
            if (p0Score > p1Score) {
                messageText.innerHTML = `${p0Name()} wins with ${p0Score} &mdash; ${p1Score}.`;
            } else if (p1Score > p0Score) {
                messageText.innerHTML = `${p1Name()} wins with ${p1Score} &mdash; ${p0Score}.`;
            } else {
                messageText.innerHTML = `The game is drawn at ${p0Score} each! Another one?`;
            }
        }
    });
});

document.querySelector('button.refresh').addEventListener('click', () => {
    resetGame();
    history.pushState(gameState, document.title);
});

window.addEventListener('popstate', ev => {
    resetGame(new Kalaha(ev.state.board.state), ev.state.player);
});
