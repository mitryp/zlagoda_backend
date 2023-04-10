/**
 * Collection of possible filters.
 */
type FilteringStrategy = {
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
    /**
     * Pagination will always be the same in any SELECT query, it is added only to keep every query fully written out in one place.
     */
    pagination: string;
};

/**
 * E.g. 'INSERT INTO Category (category_name) VALUES (?)'
 */
type InsertStrategy = string;

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
 */
type CustomSelectStrategy = string;

/**
 * Full collection of possible queries for a repository.
 */
type QueryStrategy = {
    selectStrategy: SelectStrategy;
    insertStrategy: InsertStrategy;
    updateStrategy: UpdateStrategy;
    deleteStrategy: DeleteStrategy;

    /**
     * Specialized select strategies outside of regular CRUD, e.g. for statistical queries.
     */
    [key: `${string}SelectStrategy`]: CustomSelectStrategy;
};

export { QueryStrategy, SelectStrategy, FilteringStrategy, SortingStrategy, InsertStrategy, UpdateStrategy, DeleteStrategy, CustomSelectStrategy };
