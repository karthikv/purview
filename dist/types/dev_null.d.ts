/// <reference types="node" />
declare module "dev-null" {
    import { Writable } from "stream";
    class DevNull extends Writable {
    }
    namespace DevNull {
    }
    export = DevNull;
}
