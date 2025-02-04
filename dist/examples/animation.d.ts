/// <reference types="node" />
import Purview, { JSX } from "../purview";
interface AnimationState {
    visible: boolean;
    count: number;
    step: number;
}
export default class extends Purview.Component<{}, AnimationState> {
    interval: NodeJS.Timer | null;
    state: {
        visible: boolean;
        count: number;
        step: number;
    };
    componentWillUnmount(): void;
    toggle: () => void;
    next: () => Promise<void>;
    flip: () => Promise<void>;
    render(): JSX.Element;
}
export {};
