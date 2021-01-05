class KalahBoard {
    constructor(wrapper, boardState=Array(12).fill(4).concat([0, 0])) {
        const stones = boardState.reduce((p, c) => p + c, 0);

        const board = document.createElement('div');
        board.classList.add('board');
        wrapper.appendChild(board);

        this.stoneViews = [...Array(stones).keys()].sort(() => Math.random() - 0.5).map(i => {
            const dummy = document.createElement('div');
            dummy.classList.add('stone', 'dummy', `s${i}`);
            board.appendChild(dummy);
            const real = document.createElement('div');
            real.classList.add('stone', 'real', `s${i}`);
            board.appendChild(real);
            return new StoneView(dummy, real);
        });

        this.houses = [...Array(boardState.length - 2).keys()].map(i => {
            const house = document.createElement('div');
            house.classList.add('house', `h${i}`);
            board.appendChild(house);
            return house;
        });

        this.stores = [...Array(2).keys()].map(i => {
            const store = document.createElement('div');
            store.classList.add('store', `store${i}`);
            board.appendChild(store);
            return store;
        });

        let stoneIndex = 0;
        this.state = boardState.map(numStones => {
           stoneIndex += numStones;
           return this.stoneViews.slice(stoneIndex - numStones, stoneIndex);
        });

        this.elementTransitionDuration = 0.5; // from CSS
        this.elementTransitionDelay = 0.1; // in s
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

    update(boardState) {
        const animationTime = boardState ? this._transition(boardState) : 0;
        this._layout();
        this.state.forEach(slot => {
            slot.forEach(stoneView => {
                stoneView.update();
            });
        });
        return new Promise(resolve => {
            setTimeout(() => {
                this.resetTransitionDelays();
                resolve(animationTime)
            }, animationTime * 1000);
        });
    }

    resetTransitionDelays() {
        console.log('resetting transition delays');
        this.stoneViews.forEach(s => s.real.style.transitionDelay = '0s');
    }

    playerStore(player) {
        return this.stores[player];
    }

    playerHouses(player) {
        return [
            [0, 1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10, 11]
        ][player].map(i => this.houses[i]);
    }

    activatePlayer(player) {
        this.playerStore(player).classList.add('active');
        this.playerHouses(player).forEach(h => h.classList.add('active'));
    }

    inactivatePlayer(player) {
        this.playerStore(player).classList.remove('active');
        this.playerHouses(player).forEach(h => h.classList.remove('active'));
    }
}

class StoneView {
    constructor(dummy, real) {
        this.dummy = dummy;
        this.real = real;
    }

    computeOffset() {
        let dummyRect = this.dummy.getBoundingClientRect();
        let parentRect = this.real.offsetParent.getBoundingClientRect();
        let offsetTop = dummyRect.top - parentRect.top;
        let offsetLeft = dummyRect.left - parentRect.left;
        return [offsetTop, offsetLeft];
    }

    requiresUpdate() {
        let [offsetTop, offsetLeft] = this.computeOffset();
        return Math.abs(offsetTop - this.real.offsetTop) > 1 || Math.abs(offsetLeft - this.real.offsetLeft) > 1;
    }

    update() {
        let [offsetTop, offsetLeft] = this.computeOffset();
        this.real.style.top = `${offsetTop}px`;
        this.real.style.left = `${offsetLeft}px`;
    }
}

// export { KalahBoard };
