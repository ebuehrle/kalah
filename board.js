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
        const adjHouse = (11 - endHouse) % 12;

        const endStones = newState[endHouse];
        const prevStones = newState[prevHouse];
        const nextStones = newState[nextHouse];
        const adjStones = newState[adjHouse];

        newState[12 + player] += ((2 <= endStones && endStones <= 3) ? newState.splice(endHouse, 1, 0)[0] : 0);
        newState[12 + player] += ((2 <= prevStones && prevStones <= 3) ? newState.splice(prevHouse, 1, 0)[0] : 0);
        newState[12 + player] += ((2 <= nextStones && nextStones <= 3) ? newState.splice(nextHouse, 1, 0)[0] : 0);
        newState[12 + player] += ((2 <= adjStones && adjStones <= 3) ? newState.splice(adjHouse, 1, 0)[0] : 0);

        const statePickup = newState.slice();

        return [new Board(stateDistribute), new Board(statePickup)];
    }

    moveValid(player, house) {
        const validHouses = [
            [3, 4, 5, 6, 7, 8],
            [0, 1, 2, 9, 10, 11],
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
