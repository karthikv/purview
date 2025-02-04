import Purview, { ChangeEvent, JSX } from "../purview";
interface AppState {
    animation: boolean;
    help: boolean;
    value: string;
    showFirst: boolean;
}
export default class App extends Purview.Component<{}, AppState> {
    state: {
        help: boolean;
        animation: boolean;
        value: string;
        showFirst: boolean;
    };
    toggleHelp: () => Promise<void>;
    setValue: (event: ChangeEvent) => Promise<void>;
    render(): JSX.Element;
}
export {};
