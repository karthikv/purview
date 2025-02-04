import * as t from "io-ts";
export declare const makeInputEventValidator: <T extends t.Mixed>(type: T) => t.ExactType<t.InterfaceType<{
    name: t.StringType;
    value: T;
}, t.TypeOfProps<{
    name: t.StringType;
    value: T;
}>, t.OutputOfProps<{
    name: t.StringType;
    value: T;
}>, unknown>, t.TypeOfProps<{
    name: t.StringType;
    value: T;
}>, t.OutputOfProps<{
    name: t.StringType;
    value: T;
}>, unknown>;
export declare const makeChangeEventValidator: <T extends t.Mixed>(type: T) => t.ExactType<t.InterfaceType<{
    name: t.StringType;
    value: T;
}, t.TypeOfProps<{
    name: t.StringType;
    value: T;
}>, t.OutputOfProps<{
    name: t.StringType;
    value: T;
}>, unknown>, t.TypeOfProps<{
    name: t.StringType;
    value: T;
}>, t.OutputOfProps<{
    name: t.StringType;
    value: T;
}>, unknown>;
export declare const submitEventValidator: t.ExactType<t.InterfaceType<{
    fields: t.AnyDictionaryType;
}, t.TypeOfProps<{
    fields: t.AnyDictionaryType;
}>, t.OutputOfProps<{
    fields: t.AnyDictionaryType;
}>, unknown>, t.TypeOfProps<{
    fields: t.AnyDictionaryType;
}>, t.OutputOfProps<{
    fields: t.AnyDictionaryType;
}>, unknown>;
export declare const keyEventValidator: t.ExactType<t.InterfaceType<{
    name: t.StringType;
    key: t.StringType;
}, t.TypeOfProps<{
    name: t.StringType;
    key: t.StringType;
}>, t.OutputOfProps<{
    name: t.StringType;
    key: t.StringType;
}>, unknown>, t.TypeOfProps<{
    name: t.StringType;
    key: t.StringType;
}>, t.OutputOfProps<{
    name: t.StringType;
    key: t.StringType;
}>, unknown>;
export declare const clientMessageValidator: t.TaggedUnionType<"type", (t.ExactType<t.IntersectionType<[t.InterfaceType<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}, t.TypeOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}>, t.OutputOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}>, unknown>, t.PartialType<{
    cssStateID: t.StringType;
}, t.TypeOfPartialProps<{
    cssStateID: t.StringType;
}>, t.OutputOfPartialProps<{
    cssStateID: t.StringType;
}>, unknown>], t.Compact<t.TypeOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}> & t.TypeOfPartialProps<{
    cssStateID: t.StringType;
}>>, t.Compact<t.OutputOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}> & t.OutputOfPartialProps<{
    cssStateID: t.StringType;
}>>, unknown>, t.Compact<t.TypeOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}> & t.TypeOfPartialProps<{
    cssStateID: t.StringType;
}>>, t.Compact<t.OutputOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}> & t.OutputOfPartialProps<{
    cssStateID: t.StringType;
}>>, unknown> | t.ExactType<t.IntersectionType<[t.InterfaceType<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}, t.TypeOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}>, t.OutputOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}>, unknown>, t.PartialType<{
    event: t.AnyType;
}, t.TypeOfPartialProps<{
    event: t.AnyType;
}>, t.OutputOfPartialProps<{
    event: t.AnyType;
}>, unknown>], t.Compact<t.TypeOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}> & t.TypeOfPartialProps<{
    event: t.AnyType;
}>>, t.Compact<t.OutputOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}> & t.OutputOfPartialProps<{
    event: t.AnyType;
}>>, unknown>, t.Compact<t.TypeOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}> & t.TypeOfPartialProps<{
    event: t.AnyType;
}>>, t.Compact<t.OutputOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}> & t.OutputOfPartialProps<{
    event: t.AnyType;
}>>, unknown> | t.ExactType<t.InterfaceType<{
    type: t.LiteralType<"seenEventNames">;
    seenEventNames: t.ArrayType<t.StringType, string[], string[], unknown>;
}, t.TypeOfProps<{
    type: t.LiteralType<"seenEventNames">;
    seenEventNames: t.ArrayType<t.StringType, string[], string[], unknown>;
}>, t.OutputOfProps<{
    type: t.LiteralType<"seenEventNames">;
    seenEventNames: t.ArrayType<t.StringType, string[], string[], unknown>;
}>, unknown>, t.TypeOfProps<{
    type: t.LiteralType<"seenEventNames">;
    seenEventNames: t.ArrayType<t.StringType, string[], string[], unknown>;
}>, t.OutputOfProps<{
    type: t.LiteralType<"seenEventNames">;
    seenEventNames: t.ArrayType<t.StringType, string[], string[], unknown>;
}>, unknown> | t.ExactType<t.InterfaceType<{
    type: t.LiteralType<"nextRuleIndex">;
    nextRuleIndex: t.NumberType;
}, t.TypeOfProps<{
    type: t.LiteralType<"nextRuleIndex">;
    nextRuleIndex: t.NumberType;
}>, t.OutputOfProps<{
    type: t.LiteralType<"nextRuleIndex">;
    nextRuleIndex: t.NumberType;
}>, unknown>, t.TypeOfProps<{
    type: t.LiteralType<"nextRuleIndex">;
    nextRuleIndex: t.NumberType;
}>, t.OutputOfProps<{
    type: t.LiteralType<"nextRuleIndex">;
    nextRuleIndex: t.NumberType;
}>, unknown>)[], t.Compact<t.TypeOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}> & t.TypeOfPartialProps<{
    cssStateID: t.StringType;
}>> | t.Compact<t.TypeOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}> & t.TypeOfPartialProps<{
    event: t.AnyType;
}>> | t.TypeOfProps<{
    type: t.LiteralType<"seenEventNames">;
    seenEventNames: t.ArrayType<t.StringType, string[], string[], unknown>;
}> | t.TypeOfProps<{
    type: t.LiteralType<"nextRuleIndex">;
    nextRuleIndex: t.NumberType;
}>, t.Compact<t.OutputOfProps<{
    type: t.LiteralType<"connect">;
    rootIDs: t.ArrayType<t.StringType, string[], string[], unknown>;
}> & t.OutputOfPartialProps<{
    cssStateID: t.StringType;
}>> | t.Compact<t.OutputOfProps<{
    type: t.LiteralType<"event">;
    rootID: t.StringType;
    componentID: t.StringType;
    eventID: t.StringType;
}> & t.OutputOfPartialProps<{
    event: t.AnyType;
}>> | t.OutputOfProps<{
    type: t.LiteralType<"seenEventNames">;
    seenEventNames: t.ArrayType<t.StringType, string[], string[], unknown>;
}> | t.OutputOfProps<{
    type: t.LiteralType<"nextRuleIndex">;
    nextRuleIndex: t.NumberType;
}>, unknown>;
