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

// export { StoneView };
