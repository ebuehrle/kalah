// import { Kalah } from './kalah.js';
// import { KalahBoard } from './kalahboard.js';

class RoomControls  {
    constructor() {
        this.inviteButton = document.querySelector('.room-controls button.invite');
        this.joinButton = document.querySelector('.room-controls button.join');
        this.gameidInput = document.querySelector('.room-controls input.gameid');
        this.inviteShareGroup = document.querySelector('.room-controls .invite--share');
        this.inviteEmail = document.querySelector('.room-controls .invite--email');
        this.cancelButton = document.querySelector('.room-controls .cancel');
        this.followupButton = document.querySelector('.room-controls .followup');
    }
    reset() {
        this.inviteButton.style.display = 'block';
        this.joinButton.style.display = 'block';
        this.gameidInput.style.display = 'none';
        this.inviteShareGroup.style.display = 'none';
        this.cancelButton.style.display = 'none';
        this.followupButton.style.display = 'none';
    }
    join() {
        this.inviteButton.style.display = 'none';
        this.joinButton.style.display = 'none';
        this.gameidInput.style.display = 'block';
        this.gameidInput.disabled = false;
        this.inviteShareGroup.style.display = 'none';
        this.cancelButton.style.display = 'block';
        this.followupButton.style.display = 'none';
    }
    invite(game_id) {
        roomControls.gameidInput.value = game_id;
        roomControls.inviteEmail.href = `mailto:?to=&body=Join me for a game of Kalah at ${window.location}?gameid=${game_id}, or using the Game ID ${game_id}.&subject=Fancy a game of Kalah?`;
        
        this.inviteButton.style.display = 'none';
        this.joinButton.style.display = 'none';
        this.gameidInput.style.display = 'block';
        this.gameidInput.disabled = true;
        this.inviteShareGroup.style.display = 'block';
        this.cancelButton.style.display = 'block';
        this.followupButton.style.display = 'none';
    }
    game() {
        this.inviteButton.style.display = 'none';
        this.joinButton.style.display = 'none';
        this.gameidInput.style.display = 'block';
        this.gameidInput.disabled = true;
        this.inviteShareGroup.style.display = 'none';
        this.cancelButton.style.display = 'block';
        this.followupButton.style.display = 'block';
    }
};
const roomControls = new RoomControls();
roomControls.cancelButton.addEventListener('click', () => roomControls.reset());
roomControls.reset();

const p0Name = document.querySelector('.player-name.player0');
const p1Name = document.querySelector('.player-name.player1');

const boardView = new KalahBoard(document.querySelector('.board-wrapper'));
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
let isLocal = (uid) => firebase.auth().currentUser.uid === uid;

firebase.auth().signInAnonymously()
    .then(() => console.log('Signed in anonymously.', firebase.auth().currentUser))
    .then(() => { db = firebase.firestore() })
    .then(() => attachListeners())
    .then(() => {
        const urlGameId = new URLSearchParams(window.location.search).get('gameid');
        if (urlGameId) {
            return join(urlGameId)
                .then(() => waitForOpponent(urlGameId))
                .then(gameDocSnap => enterGame(gameDocSnap));
        }
    })
    .catch(e => console.warn('Error during sign-in: ', e));

function attachListeners() {
    roomControls.inviteButton.addEventListener('click', () => 
        createGame()
            .then(gameDocRef => {
                roomControls.invite(gameDocRef.id);
                return waitForOpponent(gameDocRef.id);
            })
            .then(gameDocSnap => enterGame(gameDocSnap))
    );
    roomControls.joinButton.addEventListener('click', () => roomControls.join());
    roomControls.gameidInput.addEventListener('change', () =>
        join(roomControls.gameidInput.value)
            .then(() => waitForOpponent(roomControls.gameidInput.value))
            .then(gameDocSnap => enterGame(gameDocSnap))
    );
    roomControls.followupButton.addEventListener('click', () => {
        if (followup) {
            return join(followup)
                .then(() => waitForOpponent(followup))
                .then(gameDocSnap => enterGame(gameDocSnap));
        } else {
            return createGame()
                .then(gameDocRef => db.collection('rooms').doc(gameid).update({ 'followup': gameDocRef.id }).then(() => gameDocRef))
                .then(gameDocRef => waitForOpponent(gameDocRef.id))
                .then(snap => enterGame(snap));
        }
    });

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

function createGame() {
    let gameData = {};
    gameData['created'] = firebase.firestore.FieldValue.serverTimestamp();
    gameData[Math.random() < 0.5 ? 'uid0' : 'uid1'] = firebase.auth().currentUser.uid;
    
    return db.collection('rooms').add(gameData)
        .then(gameDocRef => { console.log('Game created successfully.'); return gameDocRef; })
        .catch(e => console.error('Could not create game: ', e));
}

function join(game) {
    return db.collection('rooms').doc(game).get().then(snap => {
        const uid0 = snap.get('uid0');
        const uid1 = snap.get('uid1');
        const uid = firebase.auth().currentUser.uid;
        if (uid0 == uid) {
            console.log('Already joined. I am player 0.');
            return game;
        } else if (uid1 == uid) {
            console.log('Already joined. I am player 1.');
            return game;  
        } else if (!uid0) {
            return snap.ref.update({
                'uid0': firebase.auth().currentUser.uid,
            }).then(() => game);
        } else if (!uid1) {
            return snap.ref.update({
                'uid1': firebase.auth().currentUser.uid,
            }).then(() => game);
        } else {
            throw 'Game already has two players.'
        }
    })
    .catch(e => {
        roomControls.gameidInput.focus();
        console.error('Could not join game: ', e);
    });
}

function waitForOpponent(game) {
    return new Promise((resolve, reject) => {
        let unsubscribe = db.collection('rooms').doc(game).onSnapshot(snap => {
            const uid0 = snap.get('uid0');
            const uid1 = snap.get('uid1');
            if (uid0 && uid1) {
                unsubscribe();
                resolve(snap);
            }
        });
        roomControls.cancelButton.addEventListener('click', () => {
            unsubscribe();
            reject('User cancelled while waiting for opponent.');
        }, { once: true });
    });
}

let lastSeenMoveTimestamp = undefined;
let followup = undefined;
let game = new Kalah(afterMove=(distribute, pickup, nextPlayer) => {
    const mystamp = lastSeenMoveTimestamp;
    boardView.update(distribute).then(() => {
        if (lastSeenMoveTimestamp === mystamp) {
            boardView.update(pickup)
        }
    });
    players[nextPlayer].prompt();
});
let unsubscribers = []

function enterGame(gameDocSnap) {
    unsubscribers.splice(0, unsubscribers.length).forEach(unsub => unsub());
    gameid = gameDocSnap.id;
    roomControls.gameidInput.value = gameid;
    const uid0 = gameDocSnap.get('uid0');
    const uid1 = gameDocSnap.get('uid1');

    const opponentuid = isLocal(uid0) ? uid1 : uid0;
    unsubscribers.push(db.collection('roomusers').doc(opponentuid).onSnapshot(snap => {
        p1Name.innerHTML = snap.get('name') || null;
    }));

    unsubscribers.push(gameDocSnap.ref.onSnapshot(snap => {
        followup = snap.get('followup');
        if (followup) {
            roomControls.followupButton.classList.add('proposed');
        } else {
            roomControls.followupButton.classList.remove('proposed');
        }
    }));

    roomControls.game();
    lastSeenMoveTimestamp = undefined;
    game.reset({ board: Kalah.init64, nextPlayer: isLocal(uid0) ? 0 : 1});
    boardView.update(game.state.board);
    players[game.state.nextPlayer].prompt();

    unsubscribers.push(db.collection('rooms').doc(gameid).collection('moves')
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
    ));
}

function makeMove(slotIdx) {
    game.move(slotIdx);
    if (game.over()) {
        const p0Score = game.playerScore(0);
        const p1Score = game.playerScore(1);
        if (p0Score > p1Score) {
            messageText.innerHTML = (p0Name.value ? `${p0Name.value} wins` : 'You win') + ` with ${p0Score} &mdash; ${p1Score}.`;
        } else if (p1Score > p0Score) {
            messageText.innerHTML = `${p1Name.innerHTML || 'Your opponent'} wins with ${p1Score} &mdash; ${p0Score}.`;
        } else {
            messageText.innerHTML = `The game is drawn at ${p0Score} each! Invite to another one?`;
        }
    }
}

boardView.houses.forEach((houseView, slotIdx) => {
    houseView.addEventListener('click', _ => {
        if (!game.moveValid(slotIdx)) {
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
