// import { Board } from './board.js';
// import { BoardView } from './boardview.js';
// import { StoneView } from './stoneview.js';
  
const dummyStones = Array.from(document.querySelectorAll('.stone.dummy'));
const realStones = Array.from(document.querySelectorAll('.stone.real'));
const houses = Array.from(document.querySelectorAll('.house'));
const stores = Array.from(document.querySelectorAll('.store'));

const p0Name = document.querySelector('.player0');
const p1Name = document.querySelector('.player1');
const messageText = document.querySelector('.message');
const refreshButton = document.querySelector('button.refresh');

realStones.forEach(s => s.classList.add([
    'red', 'green', 'yellow',
    'blue', 'purple', 'cyan'
][Math.floor(Math.random() * 6)]));

const stoneViews = realStones.map((realStone, i) => new StoneView(dummyStones[i], realStone));
let boardView = new BoardView(stoneViews, houses, stores);

window.addEventListener('resize', () => boardView.render());

function activatePlayer(player) {
    if (player === 0) {
        boardView.activatePlayer(0);
        messageText.innerHTML = `${username}, your turn.`
    } else {
        boardView.inactivatePlayer(0);
        messageText.innerHTML = `Waiting for ${seekUsername}.`
    }
}

let username = null;
let seekUsername = null;
let gameId = null;
let db = null;

firebase.auth().signInAnonymously()
    .then(() => console.log('Signed in anonymously.', firebase.auth().currentUser))
    .then(() => { db = firebase.firestore() })
    .then(() => db.collection('users').doc(firebase.auth().currentUser.uid).get())
    .then(userDocSnapshot => {
        username = userDocSnapshot.get('username') || 'Player 0';
        seekUsername = userDocSnapshot.get('seek-username') || 'Player 1';
        p0Name.value = username;
        p1Name.value = seekUsername;
    })
    .then(() => db.collection('users').doc(firebase.auth().currentUser.uid).set({
        'username': username,
    }))
    .then(() => attachListeners())
    .catch(e => console.error('Error signing in: ', e));

function attachListeners() {
    document.querySelector('.sign-in').addEventListener('click', () => {
        username = p0Name.value;
        db.collection('users').doc(firebase.auth().currentUser.uid).update({
            'username': username,
        })
        .then(() => console.log('Username set successfully to ', username))
        .catch(e => console.error('Could not set username: ', e));
    });

    document.querySelector('.challenge').addEventListener('click', () => {
        seekUsername = p1Name.value;
        let userDocRef = db.collection('users').doc(firebase.auth().currentUser.uid);
        userDocRef.update({
            "seek-username": seekUsername,
        })
        .then(() => console.log('Challenge registered successfully for ', seekUsername))
        .catch(e => console.error('Could not register challenge: ', e))
        .then(() => db.collection('users')
            .where('username', '==', seekUsername)
            .where('seek-username', '==', username)
            .limit(1).get()
        )
        .then(opponentQuerySnapshot => {
            if (opponentQuerySnapshot.empty) {
                throw 'No matching opponent online.';
            }
            opponentQuerySnapshot.forEach(opponentQueryDocRef => {
                db.collection('games').add({ 
                    'player0': firebase.auth().currentUser.uid,
                    'player1': opponentQueryDocRef.id,
                })
                .then(newGameDocRef => {
                    userDocRef.update({ 
                        'game-id': newGameDocRef.id,
                        'seek-username': firebase.firestore.FieldValue.delete(),
                    });
                    opponentQueryDocRef.ref.update({
                        'game-id': newGameDocRef.id,
                        'seek-username': firebase.firestore.FieldValue.delete(),
                    });
                })
                .then(() => console.log('Game created successfully.'));
            });
        })
        .catch(e => console.error('Could not search for opponent: ', e));
    });

    db.collection('users').doc(firebase.auth().currentUser.uid).onSnapshot(doc => {
        const newGameId = doc.get('game-id');
        if (newGameId) {
            setupGame(newGameId);
        }
    });

    console.log('listeners attached');
}

let lastSeenMoveTimestamp = undefined;
let gameState = {
    board: new Board(Array(12).fill(0).concat(24, 24)),
    player: undefined,
};
boardView.render(gameState.board.state);

function setupGame(newGameId) {
    gameId = newGameId;
    alert(`${seekUsername} has accepted your challenge.`);

    gameState = {
        board: new Board(),
        player: undefined,
    };
    boardView.render(gameState.board.state);

    db.collection('games').doc(gameId).get()
        .then(docSnapshot => {
            const player0Uid = docSnapshot.get('player0');
            const isLocalPlayer = player0Uid === firebase.auth().currentUser.uid;
            gameState.player = isLocalPlayer ? 0 : 1;
            activatePlayer(gameState.player);
        });

    db.collection('games').doc(gameId)
        .collection('moves').orderBy('timestamp')
        .onSnapshot(moveQuerySnapshot => moveQuerySnapshot.forEach(moveQueryDocSnapshot => {
            const moveTimestamp = moveQueryDocSnapshot.get('timestamp');
            if (moveTimestamp <= lastSeenMoveTimestamp) {
                return;
            }
            lastSeenMoveTimestamp = moveTimestamp;

            const playerUid = moveQueryDocSnapshot.get('uid');
            const house = moveQueryDocSnapshot.get('house');
            const isLocalPlayer = playerUid === firebase.auth().currentUser.uid;
            makeMove(
                isLocalPlayer ? 0 : 1,
                isLocalPlayer ? house : house + 6
            );
        }));
}

function makeMove(player, slotIdx) {
    const moveResult = gameState.board.move(slotIdx, player);
    if (moveResult === null) {
        console.error('Received invalid move.', player, slotIdx);
        return; // invalid move
    }

    const [boardDistribute, boardPickup] = moveResult;
    boardView.render(boardDistribute.state).then(() => boardView.render(boardPickup.state));

    gameState.board = boardPickup;
    const nextPlayer = (player + 1) % 2;
    activatePlayer(nextPlayer);

    if (!gameState.board.canMove(nextPlayer)) {
        const p0Score = gameState.board.playerScore(0);
        const p1Score = gameState.board.playerScore(1);
        if (p0Score > p1Score) {
            messageText.innerHTML = `${username} wins with ${p0Score} &mdash; ${p1Score}.`;
        } else if (p1Score > p0Score) {
            messageText.innerHTML = `${seekUsername} wins with ${p1Score} &mdash; ${p0Score}.`;
        } else {
            messageText.innerHTML = `The game is drawn at ${p0Score} each! Another one?`;
        }
    }
}

houses.forEach((houseView, slotIdx) => {
    houseView.addEventListener('click', _ => {
        console.log('click', slotIdx);
        db.collection('games').doc(gameId).collection('moves').add({
            'uid': firebase.auth().currentUser.uid,
            'house': slotIdx,
            'timestamp': firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => console.log('Move added successfully.'))
        .catch(e => console.error('Could not add move: ', e));
    });
});