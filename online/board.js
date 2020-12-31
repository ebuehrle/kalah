class Board {
    constructor(state=Array(12).fill(4).concat([0, 0])) {
        this.state = state;
    }

    move(house, player=0) {
        if (!this.moveValid(player, house)) {
            return null;
        }

        console.log(`Player ${player} Move ${house}.`)
        let newState = this.state.slice();

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

        return [new Board(stateDistribute), new Board(statePickup)];
    }

    moveValid(player, house) {
        const validHouses = [
            [0, 1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10, 11],
        ];
        return validHouses[player].includes(house) && this.state[house];
    }
    
    canMove(player) {
        for (let house = 0; house < 12; house++) {
            if (this.moveValid(player, house)) {
                return true;
            }
        }
        return false;
    }

    playerScore(player) {
        return this.state[12 + player];
    }
}

// export { Board };
