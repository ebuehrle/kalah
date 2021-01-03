// import { Kalaha } from './kalaha.js';
// import { KalahaBoard } from './kalahaboard.js';

const inviteButton = document.querySelector('button.invite');
const joinButton = document.querySelector('button.join');
const gameidInput  = document.querySelector('input.gameid');
const inviteEmail = document.querySelector('.invite--email');
const p0Name = document.querySelector('.player-name.player0');
const p1Name = document.querySelector('.player-name.player1');

const boardView = new KalahaBoard(document.querySelector('.board-wrapper'));
const messageText = document.querySelector('.message');

boardView.update(Array(12).fill(0).concat([24, 24]));
window.addEventListener('resize', () => boardView.update());

let player0 = {
    prompt: () => {
        boardView.activatePlayer(0);
        boardView.inactivatePlayer(1);
        messageText.innerHTML = p0Name.value ? `${p0Name.value}, your turn.` : 'Your turn.';
    }
};

let player1 = {
    prompt: () => {
        boardView.activatePlayer(1);
        boardView.inactivatePlayer(0);
        messageText.innerHTML = `Waiting for ${p1Name.innerHTML || 'opponent'}.`
    }
};

let players = [player0, player1];

let db = undefined;
let gameid = undefined;
let uid0 = undefined;
let uid1 = undefined;
let isLocal = (uid) => firebase.auth().currentUser.uid === uid;

firebase.auth().signInAnonymously()
    .then(() => console.log('Signed in anonymously.', firebase.auth().currentUser))
    .then(() => { db = firebase.firestore() })
    .then(() => attachListeners())
    .catch(e => console.warn('Error during sign-in: ', e));

function attachListeners() {
    inviteButton.addEventListener('click', () => invite());
    joinButton.addEventListener('click', () => join(gameidInput.value));

    p0Name.addEventListener('change', e => {
        db.collection('roomusers').doc(firebase.auth().currentUser.uid).set({
            'name': e.target.value,
        }, { merge: true })
        .then(() => console.log('Name set successfully'))
        .catch(e => console.error('Could not set name: ', e));
    });
    db.collection('roomusers').doc(firebase.auth().currentUser.uid).onSnapshot(snap => {
        p0Name.value = snap.get('name') || null;
    });
    
    console.log('listeners attached');
}

function invite() {
    db.collection('rooms').add({
        'created': firebase.firestore.FieldValue.serverTimestamp(),
        'uid0': firebase.auth().currentUser.uid,
    })
    .then(gameDocRef => {
        console.log('Game created successfully');
        listen(gameDocRef.id);
    })
    .catch(e => console.error('Could not create game: ', e));
}

function join(game) {
    if (!game) {
        gameidInput.focus();
        return;
    }
    db.collection('rooms').doc(game).update({
        'uid1': firebase.auth().currentUser.uid,
        'name1': p0Name.value,
    })
    .then(() => {
        listen(game);
    })
    .catch(e => {
        gameidInput.focus();
        console.error('Could not join game: ', e);
    });
}

let lastSeenMoveTimestamp = undefined;
let game = new Kalaha(afterMove=(distribute, pickup, nextPlayer) => {
    boardView.update(distribute).then(() => boardView.update(pickup));
    players[nextPlayer].prompt();
});

function listen(game_id) {
    gameid = game_id;
    gameidInput.value = gameid;
    inviteEmail.href = `mailto:?to=&body=Join me for a game of Kalah at ${window.location}, using the Game ID ${gameid}.&subject=Fancy a game of Kalah?`;

    db.collection('rooms').doc(gameid).onSnapshot(snap => {
        uid0 = snap.get('uid0');
        uid1 = snap.get('uid1');

        const opponentuid = isLocal(uid0) ? uid1 : uid0;
        db.collection('roomusers').doc(opponentuid).onSnapshot(snap => {
            p1Name.innerHTML = snap.get('name') || null;
        });

        if (uid0 && uid1) {
            game.reset({ board: Kalaha.init64, nextPlayer: isLocal(uid0) ? 0 : 1});
            boardView.update(game.state.board);
            players[game.state.nextPlayer].prompt();
        }
    });

    db.collection('rooms').doc(gameid).collection('moves')
    .orderBy('timestamp').onSnapshot(query =>
        query.forEach(snap => {
            const timestamp = snap.get('timestamp');
            if (timestamp <= lastSeenMoveTimestamp) {
                return;
            }
            lastSeenMoveTimestamp = timestamp;
            const house = snap.get('house');
            makeMove(isLocal(snap.get('uid')) ? house : house + 6);
        })
    );
}

function makeMove(slotIdx) {
    game.move(slotIdx);
    if (game.over()) {
        const p0Score = game.playerScore(0);
        const p1Score = game.playerScore(1);
        if (p0Score > p1Score) {
            messageText.innerHTML = `You win with ${p0Score} &mdash; ${p1Score}.`;
        } else if (p1Score > p0Score) {
            messageText.innerHTML = `Your opponent wins with ${p1Score} &mdash; ${p0Score}.`;
        } else {
            messageText.innerHTML = `The game is drawn at ${p0Score} each! Invite to another one?`;
        }
    }
}

boardView.houses.forEach((houseView, slotIdx) => {
    houseView.addEventListener('click', _ => {
        if (!game.move(slotIdx)) {
            return;
        }

        console.log('click', slotIdx);
        db.collection('rooms').doc(gameid).collection('moves').add({
            'uid': firebase.auth().currentUser.uid,
            'house': slotIdx,
            'timestamp': firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => console.log('Move sent successfully.'))
        .catch(e => console.error('Could not send move: ', e));
    });
});
