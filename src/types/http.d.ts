import Purview from "../purview"

declare module "http" {
  interface IncomingMessage {
    purview?: Purview<any, any>
  }
}
