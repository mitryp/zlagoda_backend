/**
 * Interface for short representations of database objects to be used in lookup.
 * E.g. for a customer card used in lookup when creating a check:
 * { primaryKey: "0000000000000", descriptiveAttr: "Петренко Петро Петрович" }
 */
export interface IShort {
    primaryKey: string;
    descriptiveAttr: string;
}
