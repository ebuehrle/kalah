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

    setPlayer(player) {
        if (player === 0) {
            [
                this.stores[0],
                this.houses[3], this.houses[4], this.houses[5],
                this.houses[6], this.houses[7], this.houses[8],
            ].forEach(e => e.classList.add('active'));
            [
                this.stores[1],
                this.houses[0], this.houses[1], this.houses[2],
                this.houses[9], this.houses[10], this.houses[11],
            ].forEach(e => e.classList.remove('active'));
        } else {
            [
                this.stores[0],
                this.houses[3], this.houses[4], this.houses[5],
                this.houses[6], this.houses[7], this.houses[8],
            ].forEach(e => e.classList.remove('active'));
            [
                this.stores[1],
                this.houses[0], this.houses[1], this.houses[2],
                this.houses[9], this.houses[10], this.houses[11],
            ].forEach(e => e.classList.add('active'));
        }
    }
}

// export { BoardView };
