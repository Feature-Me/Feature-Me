const easings = {
    easeInQuad: (pos: number) => {
        return Math.pow(pos, 2);
    },

    easeOutQuad: (pos: number) => {
        return -(Math.pow((pos - 1), 2) - 1);
    },

    easeInOutQuad: (pos: number) => {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 2);
        return -0.5 * ((pos -= 2) * pos - 2);
    },

    easeInCubic: (pos: number) => {
        return Math.pow(pos, 3);
    },

    easeOutCubic: (pos: number) => {
        return (Math.pow((pos - 1), 3) + 1);
    },

    easeInOutCubic: (pos: number) => {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 3);
        return 0.5 * (Math.pow((pos - 2), 3) + 2);
    },

    easeInQuart: (pos: number) => {
        return Math.pow(pos, 4);
    },

    easeOutQuart: (pos: number) => {
        return -(Math.pow((pos - 1), 4) - 1);
    },

    easeInOutQuart: (pos: number) => {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 4);
        return -0.5 * ((pos -= 2) * Math.pow(pos, 3) - 2);
    },

    easeInQuint: (pos: number) => {
        return Math.pow(pos, 5);
    },

    easeOutQuint: (pos: number) => {
        return (Math.pow((pos - 1), 5) + 1);
    },

    easeInOutQuint: (pos: number) => {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 5);
        return 0.5 * (Math.pow((pos - 2), 5) + 2);
    },

    easeInSine: (pos: number) => {
        return -Math.cos(pos * (Math.PI / 2)) + 1;
    },

    easeOutSine: (pos: number) => {
        return Math.sin(pos * (Math.PI / 2));
    },

    easeInOutSine: (pos: number) => {
        return (-0.5 * (Math.cos(Math.PI * pos) - 1));
    },

    easeInExpo: (pos: number) => {
        return (pos === 0) ? 0 : Math.pow(2, 10 * (pos - 1));
    },

    easeOutExpo: (pos: number) => {
        return (pos === 1) ? 1 : -Math.pow(2, -10 * pos) + 1;
    },

    easeInOutExpo: (pos: number) => {
        if (pos === 0) return 0;
        if (pos === 1) return 1;
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(2, 10 * (pos - 1));
        return 0.5 * (-Math.pow(2, -10 * --pos) + 2);
    },

    easeInCirc: (pos: number) => {
        return -(Math.sqrt(1 - (pos * pos)) - 1);
    },

    easeOutCirc: (pos: number) => {
        return Math.sqrt(1 - Math.pow((pos - 1), 2));
    },

    easeInOutCirc: (pos: number) => {
        if ((pos /= 0.5) < 1) return -0.5 * (Math.sqrt(1 - pos * pos) - 1);
        return 0.5 * (Math.sqrt(1 - (pos -= 2) * pos) + 1);
    },

    easeOutBounce: (pos: number) => {
        if ((pos) < (1 / 2.75)) {
            return (7.5625 * pos * pos);
        } else if (pos < (2 / 2.75)) {
            return (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
        } else if (pos < (2.5 / 2.75)) {
            return (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
        } else {
            return (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
        }
    },

    easeInBack: (pos: number) => {
        var s = 1.70158;
        return (pos) * pos * ((s + 1) * pos - s);
    },

    easeOutBack: (pos: number) => {
        var s = 1.70158;
        return (pos = pos - 1) * pos * ((s + 1) * pos + s) + 1;
    },

    easeInOutBack: (pos: number) => {
        var s = 1.70158;
        if ((pos /= 0.5) < 1) return 0.5 * (pos * pos * (((s *= (1.525)) + 1) * pos - s));
        return 0.5 * ((pos -= 2) * pos * (((s *= (1.525)) + 1) * pos + s) + 2);
    },

    elastic: (pos: number) => {
        return -1 * Math.pow(4, -8 * pos) * Math.sin((pos * 6 - 1) * (2 * Math.PI) / 2) + 1;
    },

    swingFromTo: (pos: number) => {
        var s = 1.70158;
        return ((pos /= 0.5) < 1) ? 0.5 * (pos * pos * (((s *= (1.525)) + 1) * pos - s)) :
            0.5 * ((pos -= 2) * pos * (((s *= (1.525)) + 1) * pos + s) + 2);
    },

    swingFrom: (pos: number) => {
        var s = 1.70158;
        return pos * pos * ((s + 1) * pos - s);
    },

    swingTo: (pos: number) => {
        var s = 1.70158;
        return (pos -= 1) * pos * ((s + 1) * pos + s) + 1;
    },

    bounce: (pos: number) => {
        if (pos < (1 / 2.75)) {
            return (7.5625 * pos * pos);
        } else if (pos < (2 / 2.75)) {
            return (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
        } else if (pos < (2.5 / 2.75)) {
            return (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
        } else {
            return (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
        }
    },

    bouncePast: (pos: number) => {
        if (pos < (1 / 2.75)) {
            return (7.5625 * pos * pos);
        } else if (pos < (2 / 2.75)) {
            return 2 - (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
        } else if (pos < (2.5 / 2.75)) {
            return 2 - (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
        } else {
            return 2 - (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
        }
    },

    easeFromTo: (pos: number) => {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 4);
        return -0.5 * ((pos -= 2) * Math.pow(pos, 3) - 2);
    },

    easeFrom: (pos: number) => {
        return Math.pow(pos, 4);
    },

    easeTo: (pos: number) => {
        return Math.pow(pos, 0.25);
    },
    linear: (pos: number) => {
        return pos;
    },
    reverseLinear: (pos:number) => {
        return 1 - pos
    },
    reverseLinearToMiddle: (pos:number) => {
        return -(pos*2)+1
    },
    reverseLinearToEnd: (pos:number) => {
        return 2 - pos
    }
}

export default easings;