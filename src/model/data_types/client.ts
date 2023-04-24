import { Address, Name } from "./general";

export interface IClient {
    clientId: ClientPK;
    clientName: Name;
    phone: string;
    discount: number;
    address: null | Address;
}

export type ClientPK = string;
