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

function activePlayer(player) {
    boardView.activePlayer(player);
    messageText.innerHTML = `${player ? p1Name.innerHTML : p0Name.innerHTML}, your turn.`
}

firebase.auth().signInAnonymously()
    .then(() => console.log('Signed in anonymously.', firebase.auth().currentUser))
    .then(() => attachListeners())
    .catch(e => console.error('Could not sign in: ', e));

let username = null;
let seekUsername = null;
let gameId = null;

function attachListeners() {
    let db = firebase.firestore();

    document.querySelector('#sign-in').addEventListener('click', () => {
        username = p0Name.innerHTML;
        db.collection('users').doc(firebase.auth().currentUser.uid).update({
            "username": username,
        })
        .then(() => console.log('Username set successfully to ', username))
        .catch(e => console.error('Could not set username: ', e));
    });

    document.querySelector('#challenge').addEventListener('click', () => {
        seekUsername = p1Name.innerHTML;
        db.collection('users').doc(firebase.auth().currentUser.uid).update({
            "seek-username": seekUsername,
        })
        .then(() => console.log('Challenge registered successfully for ', seekUsername))
        .catch(e => console.error('Could not register challenge: ', e))
        .then(() => db.collection('users').where('username', '==', seekUsername).limit(1).get())
        .then(opponentQuery => {
            if (opponentQuery.empty) {
                throw 'No user with username ' + seekUsername + ' online.';
            }
            opponentQuery.forEach(opponentDoc => {
                const opponentData = opponentDoc.data();
                if (opponentData['seek-username'] !== username) {
                    throw 'No reciprocal seek.';
                }
                console.log('Creating new game');
            });
        })
        .catch(e => console.error('Could not search for opponent: ', e));
    });

    db.collection('users').doc(firebase.auth().currentUser.uid).onSnapshot(doc => {
        if ('game-id' in doc && doc['game-id'] !== gameId) {
            setupGame(doc['game-id']);
        }
    });

    console.log('listeners attached');
}

function setupGame(gameId) {
    console.log('Entering game ', gameId);
}

let gameState = {
    board: new Board(),
    player: 0,
};
boardView.render(gameState.board.state);
activePlayer(gameState.player);

houses.forEach((houseView, slotIdx) => {
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
                messageText.innerHTML = `${p0Name.innerHTML} wins with ${p0Score} &mdash; ${p1Score}.`;
            } else if (p1Score > p0Score) {
                messageText.innerHTML = `${p1Name.innerHTML} wins with ${p1Score} &mdash; ${p0Score}.`;
            } else {
                messageText.innerHTML = `The game is drawn at ${p0Score} each! Another one?`;
            }
        }
    });
});
