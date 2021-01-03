// import { Kalah } from './kalah.js';
// import { KalahBoard } from './kalahboard.js';

let p0Name = () => (document.querySelector('.player0').value || 'Left');
let p1Name = () => (document.querySelector('.player1').value || 'Right');
const messageText = document.querySelector('.message');
const refreshButton = document.querySelector('button.refresh');
const boardView = new KalahBoard(document.querySelector('.board-wrapper'));

window.addEventListener('resize', () => boardView.update());

let player0 = {
    prompt: () => {
        boardView.activatePlayer(0);
        boardView.inactivatePlayer(1);
        messageText.innerHTML = `${p0Name()}, your turn.`;
    }
};

let player1 = {
    prompt: () => {
        boardView.activatePlayer(1);
        boardView.inactivatePlayer(0);
        messageText.innerHTML = `${p1Name()}, your turn.`;
    }
};

let players = [player0, player1];

let game = new Kalah(afterMove=(distribute, pickup, nextPlayer) => {
    boardView.update(distribute).then(() => boardView.update(pickup));
    history.pushState(game.state, document.title);
    players[nextPlayer].prompt();
});

function resetGame(state={ board: Kalah.init64, nextPlayer: 0 }) {
    game.reset(state);
    boardView.update(game.state.board);
    players[game.state.nextPlayer].prompt();
}

boardView.houses.forEach((houseView, slotIdx) => {
    houseView.addEventListener('click', _ => {
        game.move(slotIdx);
        if (game.over()) {
            const p0Score = game.playerScore(0);
            const p1Score = game.playerScore(1);
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
    history.pushState(game.state, document.title);
});

window.addEventListener('popstate', ev => {
    resetGame(ev.state);
});

resetGame();
history.pushState(game.state, document.title);
