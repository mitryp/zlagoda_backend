/**
 * Collection of possible filters.
 */
type FilteringStrategy = {
    primaryKeyFilter: string;
    /**
     * Template for a property with filtering conditions.
     * The stored string is directly concatenated with the WHERE clause.
     * Example usage:
     * nameFilter: `
     *     AND category_name = ?`
     */
    [key: `${string}Filter`]: string;
};

/**
 * Collection of possible sorting clauses.
 */
type SortingStrategy = {
    /**
     * Template for a property with sorting clauses.
     * Both asc and desc versions of every ORDER BY clause are fully written out to keep the queries as explicit as possible.
     * Example usage:
     * nameOrder: {
     *     asc: `
     *         ORDER BY name ASC`,
     *     desc: `
     *         ORDER BY name DESC`
     * }
     */
    [key: `${string}Order`]: {
        asc: string;
        desc: string;
    };
};

/**
 * Complete and organized collection of string building blocks for SELECT queries.
 */
type SelectStrategy = {
    /**
     * Part that is included unconditionally, and returns all data from the table.
     * Must include a WHERE TRUE clause because of the way FilteringStrategy works.
     */
    baseClause: string;
    filteringStrategy: FilteringStrategy;
    sortingStrategy: SortingStrategy;
};

/**
 * E.g. 'INSERT INTO Category (category_name) VALUES (?)'
 */
type InsertStrategy = string; // ensures that all such queries return the pk, allowing the abstract repository to definitively work with pk

/**
 * E.g. 'DELETE FROM Category WHERE category_number = ?'
 */
type DeleteStrategy = string;

/**
 * E.g. 'UPDATE Category SET category_name = ? WHERE category_number = ?
 */
type UpdateStrategy = string;

/**
 * E.g. 'SELECT COUNT(*) FROM Category'
 * or 'INSERT INTO Sale VALUES (?, ?, ?, ?)'
 */
type CustomQueryStrategy = string;

/**
 * Collection of all possible queries for a repository, without the update query (with this alone, the row data is "static":
 * only ever inserted, selected, deleted, but not updated).
 */
interface StaticQueryStrategy {
    selectStrategy: SelectStrategy;
    insertStrategy: InsertStrategy;
    deleteStrategy: DeleteStrategy;

    /**
     * Specialized select / command strategies outside of regular CRUD, e.g. for statistical queries.
     */
    [key: `${string}QueryStrategy`]: CustomQueryStrategy;
}

/**
 * Full collection of possible queries for a repository (includes updates).
 */
interface QueryStrategy extends StaticQueryStrategy {
    updateStrategy: UpdateStrategy;
}

export { StaticQueryStrategy, QueryStrategy, SelectStrategy, FilteringStrategy, SortingStrategy, InsertStrategy, UpdateStrategy, DeleteStrategy, CustomQueryStrategy };
