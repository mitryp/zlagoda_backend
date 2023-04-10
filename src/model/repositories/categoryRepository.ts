import { Database } from "sqlite3";
import { Repository } from "./repository";
import { ICategoryInput, ICategoryOutput, CategoryPK } from "../data_types/category";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";

const CATEGORY_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT category_number, category_name
            FROM Category
            WHERE TRUE`,
        filteringStrategy: {
            numberFilter: sql`
                AND category_number = ?`,
            nameFilter: sql`
                AND category_name = ?`,
        },
        sortingStrategy: {
            nameOrder: {
                asc: sql`
                    ORDER BY category_name ASC`,
                desc: sql`
                    ORDER BY category_name DESC`,
            },
        },
        pagination: sql`
            LIMIT ? OFFSET ?`,
    },
    updateStrategy: sql`
        UPDATE Category
        SET category_name = ?
        WHERE category_number = ?`,
    insertStrategy: sql`
        INSERT INTO Category (category_name)
        VALUES (?)`,
    deleteStrategy: sql`
        DELETE FROM Category
        WHERE category_number = ?`,
};

export class CategoryRepository extends Repository<CategoryPK, ICategoryInput, ICategoryOutput> {
    constructor(db: Database) {
        super(db, CATEGORY_QUERY_STRATEGY);
    }

    protected castToOutput(row: Object): ICategoryOutput {
        return { categoryNumber: row["category_number"], categoryName: row["category_name"] };
    }

    protected castToParamsArray(dto: ICategoryInput): [string] {
        return [dto.categoryName];
    }
}
