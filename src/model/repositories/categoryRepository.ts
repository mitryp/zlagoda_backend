import { Database } from "sqlite3";
import { Repository } from "./repository";
import { ICategoryInput, ICategoryOutput, CategoryPK } from "../data_types/category";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { IShort } from "../data_types/general";

const CATEGORY_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT category_number, category_name
            FROM Category
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND category_number = ?`,
            categoryNameFilter: sql`
                AND category_name = ?`,
        },
        sortingStrategy: {
            categoryNameOrder: {
                asc: sql`
                    ORDER BY category_name ASC`,
                desc: sql`
                    ORDER BY category_name DESC`,
            },
        },
    },
    updateStrategy: sql`
        UPDATE Category
        SET category_name = ?
        WHERE category_number = ?
        RETURNING category_number`,
    insertStrategy: sql`
        INSERT INTO Category (category_name)
        VALUES (?)
        RETURNING category_number`,
    deleteStrategy: sql`
        DELETE FROM Category
        WHERE category_number = ?`,

    shortSelectQueryStrategy: sql`
        SELECT category_number, category_name
        FROM Category`,
};

export class CategoryRepository extends Repository<CategoryPK, ICategoryInput, ICategoryOutput> {
    constructor(db: Database) {
        super(db, CATEGORY_QUERY_STRATEGY);
    }

    public async allInShort(): Promise<IShort[]> {
        const rows = await this.specializedSelect("shortSelectQueryStrategy");
        return rows.map((row) => {
            return { primaryKey: row["category_number"], descriptiveAttr: row["category_name"] };
        });
    }

    protected castToOutput(row: Object): ICategoryOutput {
        return { categoryId: row["category_number"], categoryName: row["category_name"] };
    }

    protected castToParamsArray(dto: ICategoryInput): [string] {
        return [dto.categoryName];
    }
}
