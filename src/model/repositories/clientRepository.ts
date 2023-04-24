import { Database } from "sqlite3";
import { Repository } from "./repository";
import { ClientPK, IClient } from "../data_types/client";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { IShort } from "../data_types/general";

const CLIENT_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT card_number, cust_name, cust_patronymic, cust_surname, phone_number, percent, city, street, zip_code
            FROM Customer_Card
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND card_number = ?`,
            discountFilter: sql`
                AND percent = ?`,
            clientSurnameFilter: sql`
                AND cust_surname LIKE '%' || ? || '%'`,
        },
        sortingStrategy: {
            clientSurnameOrder: {
                asc: sql`
                    ORDER BY cust_surname ASC`,
                desc: sql`
                    ORDER BY cust_surname DESC`,
            },
        },
        pagination: sql`
            LIMIT ? OFFSET ?`,
    },
    updateStrategy: sql`
        UPDATE Customer_Card
        SET card_number = ?,
            cust_name = ?,
            cust_patronymic = ?,
            cust_surname = ?,
            phone_number = ?,
            percent = ?,
            city = ?,
            street = ?,
            zip_code = ?
        WHERE card_number = ?
        RETURNING card_number`,
    insertStrategy: sql`
        INSERT INTO Customer_Card (
            card_number,
            cust_name,
            cust_patronymic,
            cust_surname,
            phone_number,
            percent,
            city,
            street,
            zip_code
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING card_number`,
    deleteStrategy: sql`
        DELETE FROM Customer_Card
        WHERE card_number = ?`,

    shortSelectQueryStrategy: sql`
        SELECT card_number, (cust_surname || ' ' || cust_name || (COALESCE(' ' || cust_patronymic, ''))) AS cust_fullname
        FROM Customer_Card`,
};

export class ClientRepository extends Repository<ClientPK, IClient, IClient> {
    constructor(db: Database) {
        super(db, CLIENT_QUERY_STRATEGY);
    }

    public async allInShort(): Promise<IShort[]> {
        const rows = await this.specializedSelect("shortSelectQueryStrategy");
        return rows.map((row) => {
            return { primaryKey: row["card_number"], descriptiveAttr: row["cust_fullname"] };
        });
    }

    protected castToOutput(row: Object): IClient {
        return {
            clientId: row["card_number"],
            name: {
                firstName: row["cust_name"],
                middleName: row["cust_patronymic"],
                lastName: row["cust_surname"],
            },
            phone: row["phone_number"],
            discount: row["percent"],
            address: row["city"]
                ? {
                      city: row["city"],
                      street: row["street"],
                      index: row["zip_code"],
                  }
                : null, // if city is null, all are null and there is no address known for the card
        };
    }

    protected castToParamsArray(dto: IClient): [ClientPK, string, string | null, string, string, number, string | null, string | null, string | null] {
        return [
            dto.clientId,
            dto.name.firstName,
            dto.name.middleName, // may be null
            dto.name.lastName,
            dto.phone,
            dto.discount,
            dto.address ? dto.address.city : null,
            dto.address ? dto.address.street : null,
            dto.address ? dto.address.index : null,
        ];
    }
}
