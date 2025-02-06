declare module "inline-style-expand-shorthand" {
    import * as CSS from "csstype";
    function expandProperty(property: string, value: string): CSS.Properties | undefined;
}
