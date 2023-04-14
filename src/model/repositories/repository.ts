import { Database } from "sqlite3";
import { OrderParam, SqlQueryBuilder } from "../sqlQueryBuilder";
import { DbHelpers } from "../dbHelpers";
import { QueryStrategy } from "../queryStrategy";

/**
 * For better reliability in SelectParams, this type is used to tightly couple filter keys with corresponding filter parameters.
 */
export type FilterParam = {
    key: string;
    params: unknown[];
};

export type Pagination = {
    limit: number;
    offset: number;
};

export type SelectParams = {
    filters: FilterParam[];
    order: OrderParam;
};

/**
 * InputDTO is the interface of the data transfer object with the data that comes in (e.g. for insertion).
 * Similarly, OutputDTO is the interface of the object that comes out of the regular select.
 * In many scenarios this distinction does not matter, so the default value for OutputDTO is InputDTO.
 * However, in case of Receipt and Employee repositories, for example, there are differences between input and output structures.
 * PK is the type of the primary key (a singular value).
 */
export abstract class Repository<PK, InputDTO, OutputDTO = InputDTO> {
    protected queryBuilder: SqlQueryBuilder;

    protected constructor(protected db: Database, queryStrategy: QueryStrategy) {
        this.queryBuilder = new SqlQueryBuilder(queryStrategy);
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

    public async select(params: SelectParams = { filters: [], order: null }, pagination: Pagination = { limit: 20, offset: 0 }): Promise<OutputDTO[]> {
        // build key and param arrays (specifically the filter part) according to the configuration passed in parameters
        // this ensures that overall order of parameters matches the order of filters, and therefore values are substituted in correct places in the query
        let filterKeys: string[] = [];
        let queryParams: unknown[] = [];
        params.filters.forEach((filter: FilterParam) => {
            filterKeys.push(filter.key); // add the filter key
            queryParams = [...queryParams, ...filter.params]; // add specific filter's parameters to full query parameters (e.g. parameter "Dairy" for category's "nameFilter")
        });
        queryParams.push(pagination.limit);
        queryParams.push(pagination.offset);
        const rows: Object[] = await DbHelpers.select(this.db, this.queryBuilder.buildSelect({ filters: filterKeys, order: params.order }), "Selected from DB", queryParams);
        return rows.map(this.castToOutput);
    }

    /**
     * Will return the first of the results.
     * As such, does not take in sorting or pagination settings.
     * It is recommended to use this method when you know that only one row will be returned.
     */
    public async selectFirst(filters: FilterParam[]): Promise<OutputDTO> {
        const arr: OutputDTO[] = await this.select({ filters: filters, order: null }, { limit: 1, offset: 0 });
        return arr[0];
    }

    public insert(InputDTO: InputDTO): Promise<void> {
        return DbHelpers.run(this.db, this.queryBuilder.buildInsert(), "Inserted row into DB", this.castToParamsArray(InputDTO));
    }
    /**
     * The row must contain the primary key.
     * Other values will be overwritten with the values from this object.
     */
    public update(primaryKey: PK, InputDTO: InputDTO): Promise<void> {
        return DbHelpers.run(this.db, this.queryBuilder.buildUpdate(), "Updated row", [...this.castToParamsArray(InputDTO), primaryKey]);
    }

    public delete(primaryKey: PK): Promise<void> {
        return DbHelpers.run(this.db, this.queryBuilder.buildDelete(), "Deleted row", [primaryKey]);
    }

    /**
     * Helper method for internal use: all specialized selects are expected to be wrapped by methods that know the return type.
     */
    protected async specializedSelect(key: string, params: unknown[]): Promise<Object[]> {
        return DbHelpers.select(this.db, this.queryBuilder.buildCustomSelect(key), "Selected specialized data from DB, the key of select query is " + key, params);
    }

    /**
     * Similarly to selectFirst, this is for convenience when exactly one result is expected.
     */
    protected async specializedSelectFirst(key: string, params: unknown[]): Promise<Object> {
        const arr: Object[] = await this.specializedSelect(key, params);
        return arr[0];
    }
}
