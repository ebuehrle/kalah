class BoardView {
    constructor(stoneViews, houses, stores, boardState=Array(12).fill(4).concat([0, 0])) {
        this.elementTransitionDuration = 0.5; // from CSS
        this.elementTransitionDelay = 0.1; // in s

        this.stoneViews = stoneViews;
        this.houses = houses;
        this.stores = stores;

        let stoneIndex = 0;
        this.state = boardState.map(numStones => {
           stoneIndex += numStones;
           return this.stoneViews.slice(stoneIndex - numStones, stoneIndex);
        });
    }

    _transition(boardState) {
        let freeStones = [];
        let pickupSlot = -1;

        boardState.forEach((numStones, slotIdx) => {
            const numPickup = Math.max(0, this.state[slotIdx].length - numStones);
            const pickup = this.state[slotIdx].splice(this.state[slotIdx].length - numPickup, numPickup);
            freeStones.push(...pickup.reverse());

            if (pickup.length && pickupSlot === -1) {
                pickupSlot = slotIdx;
            }
        });

        pickupSlot = (pickupSlot !== -1) ? pickupSlot : 0;
        let totalDelay = 0;
        for (let i = 0; i < boardState.length; i++) {
            const slotIdx = (pickupSlot + i) % boardState.length;
            const numStones = boardState[slotIdx];

            let distribute = freeStones.splice(0, Math.max(0, numStones - this.state[slotIdx].length));
            this.state[slotIdx].push(...distribute);

            distribute.forEach(stoneView => {
                stoneView.real.style.transitionDelay = `${totalDelay}s`;
                totalDelay += this.elementTransitionDelay;
            })
        }

        const animationTime = totalDelay + (totalDelay ? this.elementTransitionDuration : 0);
        return animationTime;
    }

    _layout() {
        const slots = [
            ...this.houses,
            ...this.stores,
        ];
        this.state.forEach((slot, i) => {
            slot.forEach(stoneView => slots[i].appendChild(stoneView.dummy));
        });
    }

    render(boardState) {
        const animationTime = boardState ? this._transition(boardState) : 0;

        this._layout();

        this.state.forEach(slot => {
            slot.forEach(stoneView => {
                stoneView.update();
            });
        });

        return new Promise(resolve => {
            setTimeout(() => resolve(animationTime), animationTime * 1000);
        });
    }

    activatePlayer(player) {
        const player0Store = this.stores[0];
        const player1Store = this.stores[1];
        const player0Houses = [0, 1, 2, 3, 4, 5].map(i => this.houses[i]);
        const player1Houses = [6, 7, 8, 9, 10, 11].map(i => this.houses[i]);

        if (player === 0) {
            player0Store.classList.add('active');
            player0Houses.forEach(h => h.classList.add('active'));
        } else {
            player1Store.classList.add('active');
            player1Houses.forEach(h => h.classList.add('active'));
        }
    }

    inactivatePlayer(player) {
        const player0Store = this.stores[0];
        const player1Store = this.stores[1];
        const player0Houses = [0, 1, 2, 3, 4, 5].map(i => this.houses[i]);
        const player1Houses = [6, 7, 8, 9, 10, 11].map(i => this.houses[i]);

        if (player === 0) {
            player0Store.classList.remove('active');
            player0Houses.forEach(h => h.classList.remove('active'));
        } else {
            player1Store.classList.remove('active');
            player1Houses.forEach(h => h.classList.remove('active'));
        }
    }
}

// export { BoardView };
