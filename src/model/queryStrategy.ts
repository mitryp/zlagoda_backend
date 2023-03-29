/** Defines the filtering strategy for queries with filtering and sorting */
type FilteringStrategy = {
    // The base clause for filtering. When filtering by only field is required, use only this field.
    filteringClause: string,

    // When filtering by more than one field is required, put general (by all fields at once) filtering clause in
    // the `filteringClause` field, and specify other clause types after like follows:
    // `ageFilteringClause = 'WHERE age = ?'` etc.
    [key: `${string}FilteringClause`]: string
}

type SelectStrategy = {
    //
    // `SELECT user
    // FROM users`
    //
    baseClause: string,

    filteringStrategy: FilteringStrategy,

    // Something like 'WHERE id = ?'
    // This filter clause should make the query return either one or zero rows
    singleRowFilterClause: string,

    // 'ORDER BY id'
    sortingClause: string,
}

/**
 * E.g. 'INSERT INTO users (name, email) VALUES (?, ?)'
 */
type InsertStrategy = string;

/**
 * E.g. 'DELETE FROM users WHERE id = ?'
 */
type DeleteStrategy = string;

/**
 * E.g. 'UPDATE users SET name = ?, email = ?, phone = ?' etc.
 */
type UpdateStrategy = string;

type QueryStrategy = {
    selectStrategy: SelectStrategy;
    insertStrategy: InsertStrategy;
    updateStrategy: UpdateStrategy;
    deleteStrategy: DeleteStrategy;
}

export {QueryStrategy, SelectStrategy, FilteringStrategy, InsertStrategy, UpdateStrategy, DeleteStrategy};