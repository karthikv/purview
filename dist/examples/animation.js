"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const purview_1 = require("../purview");
const waveCSS = purview_1.css({
    position: "relative",
    height: "150px",
    width: "100%",
    overflow: "hidden",
});
const baseBarCSS = purview_1.css({
    position: "absolute",
    height: "100%",
    borderRadius: "50%",
    maxWidth: "10px",
});
class default_1 extends purview_1.default.Component {
    constructor() {
        super(...arguments);
        this.interval = null;
        this.state = { visible: false, count: 0, step: 0.5 };
        this.toggle = () => {
            void this.setState(state => {
                if (state.visible) {
                    if (this.interval) {
                        clearInterval(this.interval);
                        this.interval = null;
                    }
                }
                else {
                    this.interval = setInterval(this.next, 1000 / 60);
                }
                return { visible: !state.visible };
            });
        };
        this.next = () => this.setState(state => ({ count: state.count + state.step }));
        this.flip = () => this.setState(state => ({ step: -state.step }));
    }
    componentWillUnmount() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    render() {
        const barCount = 80;
        const barWidth = 100 / barCount;
        const bars = [];
        const count = this.state.count;
        for (let i = 0; i < barCount; i++) {
            const translateY = Math.sin(count / 10 + i / 5) * 100 * 0.5;
            const hue = ((360 / barCount) * i - count) % 360;
            const color = "hsl(" + hue + ",95%,55%)";
            const rotation = (count + i) % 360;
            const barX = barWidth * i;
            const barCSS = purview_1.css({
                width: `${barWidth}%`,
                left: `${barX}%`,
                backgroundColor: color,
            });
            // Don't use Purview's built-in CSS handling for this rule, as it requires too many unique rules for the atomic CSS.
            const transformStyle = `transform: scale(0.8,.5) translateY(${translateY}%) rotate(${rotation}deg);`;
            bars.push(purview_1.default.createElem("div", { css: purview_1.css(baseBarCSS, barCSS), style: transformStyle }));
        }
        let wave = null;
        if (this.state.visible) {
            wave = (purview_1.default.createElem("div", { onClick: this.flip, css: waveCSS }, bars));
        }
        return (purview_1.default.createElem("div", null,
            purview_1.default.createElem("button", { onClick: this.toggle }, "Toggle Animation"),
            wave));
    }
}
exports.default = default_1;
//# sourceMappingURL=animation.js.map