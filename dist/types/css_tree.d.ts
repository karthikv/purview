declare module "css-tree" {
    interface MatchResult {
        error: Error | null;
    }
    interface Lexer {
        matchProperty(propertyName: string, value: string): MatchResult;
    }
    const lexer: Lexer;
}
