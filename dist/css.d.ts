import { JSX } from "./purview";
import { Properties, SimplePseudos } from "csstype";
import { Component } from "./purview";
declare type OptionalProperties = {
    [key in keyof Properties]?: Properties[key] | null | false;
};
declare type PseudoProperties<T> = {
    [key in SimplePseudos]?: T;
};
export interface CSSProperties extends OptionalProperties, PseudoProperties<OptionalProperties> {
}
export interface CSS extends Properties, PseudoProperties<Properties> {
    __brand: "CSS";
}
export interface AtomicProperty<K extends keyof Properties> {
    key: K;
    value: Properties[K];
    pseudoClass?: SimplePseudos;
}
export declare type RuleTemplate = string & {
    __brand: "RuleTemplate";
};
export declare const CLASS_PREFIX = "p-";
export declare function css(...allCSSProperties: CSSProperties[]): CSS;
export declare function generateClass(index: number): string;
export declare function generateRuleTemplate<K extends keyof Properties>(ap: AtomicProperty<K>): RuleTemplate;
export declare function generateRule(className: string, ruleTemplate: RuleTemplate): string;
export declare function getAtomicProperties(cssAttr: CSS): Array<AtomicProperty<any>>;
export declare function styledTag<K extends keyof JSX.IntrinsicElements>(Tag: K, ...baseCSSProperties: CSSProperties[]): new (props: JSX.IntrinsicElements[K]) => Component<JSX.IntrinsicElements[K], {}>;
export {};
