class Kalah {

    static get init64() { return [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0]; };

    constructor(afterMove=() => {}, state={ board: Kalah.init64, nextPlayer: 0 }) {
        this.reset(state);
        this.afterMove = afterMove;
    }

    reset(state={ board: Kalah.init64, nextPlayer: 0 }) {
        this.state = state;
    }

    moveValid(house) {
        return Kalah.moveValid(this.state.board, this.state.nextPlayer, house);
    }

    move(house) {
        if (!this.moveValid(house)) {
            return null;
        }

        const moveResult = Kalah.move(this.state.board, house);
        if (moveResult) {
            this.state.board = moveResult[1];
            this.state.nextPlayer = (this.state.nextPlayer + 1) % 2;
            if (this.afterMove && typeof(this.afterMove) == 'function') {
                this.afterMove(...moveResult, this.state.nextPlayer);
            }
        }
        
        return moveResult;
    }

    over() {
        return !Kalah.canMove(this.state.board, this.state.nextPlayer);
    }

    playerScore(player) {
        return Kalah.playerScore(this.state.board, player);
    }

    static move(state, house) {
        let player;
        if (Kalah.moveValid(state, 0, house)) {
            player = 0;
        } else if (Kalah.moveValid(state, 1, house)) {
            player = 1;
        } else {
            return null; // invalid move
        }
    
        console.log(`Player ${player} Move ${house}.`)
        let newState = state.slice();
    
        let pickup = newState.splice(house, 1, 0)[0];
        while (pickup) {
            house = (house + 1) % 12;
            newState[house]++;
            pickup--;
        }
    
        const stateDistribute = newState.slice();
    
        const endHouse = house % 12;
        const prevHouse = (endHouse + 11) % 12;
        const nextHouse = (endHouse + 1) % 12;
        const adjHouse = (17 - endHouse) % 12;
    
        const endStones = newState[endHouse];
        const prevStones = newState[prevHouse];
        const nextStones = newState[nextHouse];
        const adjStones = newState[adjHouse];
    
        const playerStore = 12 + player;
        const canPickup = stones => (2 <= stones && stones <= 3);
    
        newState[playerStore] += (canPickup(endStones) ? newState.splice(endHouse, 1, 0)[0] : 0);
        newState[playerStore] += (canPickup(prevStones) ? newState.splice(prevHouse, 1, 0)[0] : 0);
        newState[playerStore] += (canPickup(nextStones) ? newState.splice(nextHouse, 1, 0)[0] : 0);
        newState[playerStore] += (canPickup(adjStones) ? newState.splice(adjHouse, 1, 0)[0] : 0);
    
        const statePickup = newState.slice();
    
        return [stateDistribute, statePickup];
    }
    
    static moveValid(state, player, house) {
        const validHouses = [
            [0, 1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10, 11],
        ]; 
        return validHouses[player].includes(house) && state[house];
    }
    
    static canMove(state, player) {
        for (let house = 0; house < 12; house++) {
            if (Kalah.moveValid(state, player, house)) {
                return true;
            }
        }
        return false;
    }
    
    static playerScore(state, player) {
        return state[12 + player];
    }
    
}

// export { Kalah };
