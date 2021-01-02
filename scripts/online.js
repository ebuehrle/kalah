// import { Kalaha } from './kalaha.js';
// import { KalahaBoard } from './kalahaboard.js';

const p0Name = document.querySelector('.player0');
const p1Name = document.querySelector('.player1');
const messageText = document.querySelector('.message');
const signInStatus = document.querySelector('.sign-in .status');
const challengeStatus = document.querySelector('.challenge .status');
const boardView = new KalahaBoard(document.querySelector('.board-wrapper'));

window.addEventListener('resize', () => boardView.update());

function activePlayer(player) {
    boardView.activatePlayer(player);
    boardView.inactivatePlayer((player + 1) % 2);
    if (player === 0) {
        messageText.innerHTML = `${username}, your turn.`
    } else {
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
        username = userDocSnapshot.get('username') || null;
        seekUsername = userDocSnapshot.get('last_seek_username') || null;
        setUsername(username);
        p1Name.value = seekUsername;
        userDocSnapshot.ref.update({
            'seek_username': firebase.firestore.FieldValue.delete(),
        });
        userDocSnapshot.ref.collection('games').doc('participating').update({
            'game_id': firebase.firestore.FieldValue.delete(),
        });
    })
    .then(() => attachListeners())
    .catch(e => console.warn('Error during sign-in: ', e));

function setUsername(name) {
    if (!name) {
        return;
    }

    if (name === username) {
        signInStatus.innerHTML = username ? 'done' : ''; 
    }

    if (name && name !== username) {
        username = name;
        db.collection('users').doc(firebase.auth().currentUser.uid).set({
            'username': username,
        }, { merge: true })
        .then(() => {
            signInStatus.innerHTML = username ? 'done' : ''; 
        })
        .catch(e => {
            signInStatus.innerHTML = '';
            console.error('Could not set username: ', e);
        });
    }

    p0Name.value = username;
}

function setSeekUsername(name) {
    if (!name) {
        return;
    }

    seekUsername = name;
    let userDocRef = db.collection('users').doc(firebase.auth().currentUser.uid);
    userDocRef.update({
        'seek_username': seekUsername,
        'last_seek_username': seekUsername,
    })
    .then(() => { challengeStatus.innerHTML = 'done'; })
    .catch(e => { 
        challengeStatus.innerHTML = '';
        console.error('Could not register challenge: ', e);
    })
    .then(() => db.collection('users')
        .where('username', '==', seekUsername)
        .where('seek_username', '==', username)
        .limit(1).get()
    )
    .then(opponentQuerySnapshot => {
        if (opponentQuerySnapshot.empty) {
            throw 'No matching opponent online.';
        }
        opponentQuerySnapshot.forEach(opponentQueryDocRef =>
            db.collection('games').add({ 
                'player0': firebase.auth().currentUser.uid,
                'player1': opponentQueryDocRef.id,
            })
            .then(newGameDocRef =>
                opponentQueryDocRef.ref.collection('games').doc('participating').set({
                    'game_id': newGameDocRef.id,
                })
                .then(() => userDocRef.collection('games').doc('participating').set({ 
                    'game_id': newGameDocRef.id,
                }))
            )
            .then(() => console.log('Game created successfully.'))
            .catch(e => console.error('Found opponent but could not create game: ', e))
        )
    })
    .catch(e => console.error('Could not search for opponent: ', e));

    p1Name.value = seekUsername;
}

function attachListeners() {
    document.querySelector('.sign-in').addEventListener('click', () => {
        setUsername(p0Name.value);
    });

    document.querySelector('.challenge').addEventListener('click', () => {
        setSeekUsername(p1Name.value);
    });

    db.collection('users').doc(firebase.auth().currentUser.uid).collection('games').doc('participating').onSnapshot(doc => {
        const newGameId = doc.get('game_id');
        if (newGameId) {
            setupGame(newGameId);
        }
    });

    console.log('listeners attached');
}

let lastSeenMoveTimestamp = undefined;
let game = new Kalaha(afterMove=(distribute, pickup, nextPlayer) => {
    boardView.update(distribute).then(() => boardView.update(pickup));
    activePlayer(nextPlayer);
});
boardView.update(Array(12).fill(0).concat([24, 24]));

function setupGame(newGameId) {
    gameId = newGameId;
    challengeStatus.innerHTML = 'done_all';

    db.collection('users').doc(firebase.auth().currentUser.uid).update({
        'seek_username': firebase.firestore.FieldValue.delete(),
    })
    .then(() => console.log('seek_username successfully reset'))
    .catch(e => console.error('Could not reset seek_username: ', e));

    db.collection('games').doc(gameId).get()
        .then(docSnapshot => {
            const player0Uid = docSnapshot.get('player0');
            const isLocalPlayer = player0Uid === firebase.auth().currentUser.uid;
            game.reset({ board: Kalaha.init64, nextPlayer: isLocalPlayer ? 0 : 1});
            boardView.update(game.state.board);
            activePlayer(game.state.nextPlayer);
        })
        .catch(e => console.error('Could not get game information: ', e));

    db.collection('games').doc(gameId)
        .collection('moves').orderBy('timestamp')
        .onSnapshot(moveQuerySnapshot => moveQuerySnapshot
            .forEach(snap => {
                const timestamp = snap.get('timestamp');
                if (timestamp <= lastSeenMoveTimestamp) {
                    return;
                }
                lastSeenMoveTimestamp = timestamp;
                const playerUid = snap.get('uid');
                const house = snap.get('house');
                const isLocalPlayer = playerUid === firebase.auth().currentUser.uid;
                makeMove(isLocalPlayer ? house : house + 6);
            }
        ));
}

function makeMove(slotIdx) {
    game.move(slotIdx);
    if (game.over()) {
        const p0Score = game.playerScore(0);
        const p1Score = game.playerScore(1);
        if (p0Score > p1Score) {
            messageText.innerHTML = `${username} wins with ${p0Score} &mdash; ${p1Score}.`;
        } else if (p1Score > p0Score) {
            messageText.innerHTML = `${seekUsername} wins with ${p1Score} &mdash; ${p0Score}.`;
        } else {
            messageText.innerHTML = `The game is drawn at ${p0Score} each! Another one?`;
        }
    }
}

boardView.houses.forEach((houseView, slotIdx) => {
    houseView.addEventListener('click', _ => {
        if (!game.move(slotIdx)) {
            return;
        }

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
