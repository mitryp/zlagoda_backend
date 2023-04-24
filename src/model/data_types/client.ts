export interface IClient {
    clientId: ClientPK;
    clientName: {
        firstName: string;
        middleName: null | string;
        lastName: string;
    };
    phone: string;
    discount: number;
    address: null | {
        city: string;
        street: string;
        index: string;
    };
}

export type ClientPK = string;
