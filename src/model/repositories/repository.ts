import { Database } from "better-sqlite3";
import { OrderParam, StaticSqlQueryBuilder, SqlQueryBuilder } from "../sqlQueryBuilder";
import { DbHelpers } from "../dbHelpers";
import { StaticQueryStrategy, QueryStrategy } from "../queryStrategy";

/**
 * For better reliability in SelectParams, this type is used to tightly couple filter keys with corresponding filter parameters.
 */
export type FilterParam = {
    key: string;
    param: unknown;
};

export type Pagination = {
    limit: number;
    offset: number;
};

/**
 * InputDTO is the interface of the data transfer object with the data that comes in (e.g. for insertion).
 * Similarly, OutputDTO is the interface of the object that comes out of the regular select.
 * PK is the type of the primary key (a singular value).
 */
export abstract class StaticRepository<PK, InputDTO, OutputDTO = InputDTO> {
    protected staticQueryBuilder: StaticSqlQueryBuilder;

    protected constructor(protected db: Database, queryStrategy: StaticQueryStrategy, staticQueryBuilder?: StaticSqlQueryBuilder) {
        this.staticQueryBuilder = staticQueryBuilder ?? new StaticSqlQueryBuilder(queryStrategy); // creates a new builder if called on its own, or can bind to an existing query builder
    }

    /**
     * Takes a row object values in the exact order as they are returned by the database query
     * and returns an object with interface OutputDTO.
     * Note that the actual object may have more properties.
     * For example, when the base SELECT returns a joined table, e.g. for Store_Product which needs its Product's name.
     */
    protected abstract castToOutput(row: Object): OutputDTO;

    /**
     * Builds a parameter array for INSERT / UPDATE queries from a InputDTO.
     */
    protected abstract castToParamsArray(dto: InputDTO): unknown[];

    /**
     * Runs a select query and returns an object with the paginated result array and the length of the non-paginated result array.
     */
    public async select(filters: FilterParam[] = [], order: OrderParam = null, pagination: Pagination = { limit: 0, offset: 0 }): Promise<{ rows: OutputDTO[]; baseLength: number }> {
        // build key and param arrays (specifically the filter part) according to the configuration passed in parameters
        // this ensures that overall order of parameters matches the order of filters, and therefore values are substituted in correct places in the query
        let [filterKeys, queryParams] = this.parseFilters(filters);
        let rows: Object[] = await DbHelpers.select(this.db, this.staticQueryBuilder.buildSelect({ filters: filterKeys, order: order }), "Selected from DB", queryParams);
        const length = rows.length;
        if (pagination.limit > 0) rows = rows.slice(pagination.offset, pagination.offset + pagination.limit);
        return { rows: rows.map(this.castToOutput), baseLength: length };
    }

    /**
     * Will return the first of the results.
     * As such, does not take in sorting or pagination settings.
     * It is recommended to use this method when you know that only one row will be returned.
     */
    public async selectFirst(filters: FilterParam[]): Promise<OutputDTO | null> {
        let [filterKeys, queryParams] = this.parseFilters(filters);
        const row = await DbHelpers.selectFirst(this.db, this.staticQueryBuilder.buildSelect({ filters: filterKeys, order: null }), "Selected one from DB", queryParams);
        return row ? this.castToOutput(row) : null;
    }

    /**
     * Shorthand method for selecting by primary key.
     */
    public async selectByPK(pk: PK): Promise<OutputDTO | null> {
        return this.selectFirst([{ key: "primaryKeyFilter", param: pk }]);
    }

    /**
     * After successful insertion, returns the primary key of the object to allow querying if it is needed.
     */
    public async insert(dto: InputDTO): Promise<PK> {
        const pkRow = await DbHelpers.selectFirst(this.db, this.staticQueryBuilder.buildInsert(), "Inserted row into DB", this.castToParamsArray(dto));
        return Object.values(pkRow)[0]; // by convention, insert and update statements of repositories must end with RETURNING and return the primary key, so that it is always known after insertion (important, for example, with autoincrement PKs)
    }

    // Since it is a common requirement to fetch an inserted or updated entity in output format, the functionality is encapsulated in separate methods, while leaving the raw insert and update for more specific uses
    public async insertAndReturn(dto: InputDTO): Promise<OutputDTO> {
        const pk = await this.insert(dto);
        return this.selectByPK(pk);
    }

    public async delete(primaryKey: PK): Promise<void> {
        await DbHelpers.run(this.db, this.staticQueryBuilder.buildDelete(), "Deleted row", [primaryKey]);
    }

    /**
     * Helper method for internal use: all specialized selects are expected to be wrapped by methods that know the return type.
     */
    protected async specializedSelect(key: string, params: unknown[] = []): Promise<Object[]> {
        return DbHelpers.select(this.db, this.staticQueryBuilder.buildCustomQuery(key), "Selected specialized data from DB, the key of select query is " + key, params);
    }

    /**
     * Similarly to selectFirst, this is for convenience when exactly one result is expected.
     */
    protected async specializedSelectFirst(key: string, params: unknown[] = []): Promise<Object | null> {
        return DbHelpers.selectFirst(this.db, this.staticQueryBuilder.buildCustomQuery(key), "Selected one specialized row from DB, the key of select query is " + key, params);
    }

    protected async specializedCommand(key: string, params: unknown[] = []): Promise<void> {
        await DbHelpers.run(this.db, this.staticQueryBuilder.buildCustomQuery(key), "Ran specialized command with key " + key, params);
    }

    protected async specializedFilteredSelect(
        key: string,
        filters: FilterParam[] = [],
        order: OrderParam = null,
        pagination: Pagination = { limit: 0, offset: 0 }
    ): Promise<{ rows: Object[]; baseLength: number }> {
        let [filterKeys, queryParams] = this.parseFilters(filters);
        let rows: Object[] = await DbHelpers.select(
            this.db,
            this.staticQueryBuilder.buildCustomFilteredSelect(key, { filters: filterKeys, order: order }),
            "Specialized filtered selected from DB",
            queryParams
        );
        const length = rows.length;
        if (pagination.limit > 0) rows = rows.slice(pagination.offset, pagination.offset + pagination.limit);
        return { rows: rows, baseLength: length };
    }

    protected async specializedFilteredSelectFirst(key: string, filters: FilterParam[] = []): Promise<Object | null> {
        let [filterKeys, queryParams] = this.parseFilters(filters);
        const row = await DbHelpers.selectFirst(this.db, this.staticQueryBuilder.buildCustomFilteredSelect(key, { filters: filterKeys, order: null }), "Specialized filtered selected one from DB", queryParams);
        return row;
    }

    /**
     * @param filters filter objects (keys in strategy + their parameters)
     * @returns array of keys and single array of query params (order matches with key order)
     */
    private parseFilters(filters: FilterParam[]): [string[], unknown[]] {
        let filterKeys: string[] = [];
        let queryParams: unknown[] = [];
        filters.forEach((filter: FilterParam) => {
            filterKeys.push(filter.key); // add the filter key
            queryParams = [...queryParams, filter.param]; // add specific filter's parameters to full query parameters (e.g. parameter "Dairy" for category's "nameFilter")
        });
        return [filterKeys, queryParams];
    }
}

export abstract class Repository<PK, InputDTO, OutputDTO = InputDTO> extends StaticRepository<PK, InputDTO, OutputDTO> {
    protected queryBuilder: SqlQueryBuilder;

    constructor(db: Database, queryStrategy: QueryStrategy) {
        const queryBuilder = new SqlQueryBuilder(queryStrategy); // workaround for the fact that this's queryBuilder cannot be assigned before super() is called
        super(db, queryStrategy, queryBuilder);
        this.queryBuilder = queryBuilder;
    }

    public async update(primaryKey: PK, InputDTO: InputDTO): Promise<PK> {
        const pkRow = await DbHelpers.selectFirst(this.db, this.queryBuilder.buildUpdate(), "Updated row", [...this.castToParamsArray(InputDTO), primaryKey]);
        return Object.values(pkRow)[0];
    }

    public async updateAndReturn(primaryKey: PK, dto: InputDTO): Promise<OutputDTO> {
        const pk = await this.update(primaryKey, dto);
        return this.selectByPK(pk);
    }
}
