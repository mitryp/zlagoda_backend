import { Database } from "sqlite3";
import { SqlQueryBuilder } from "../sqlQueryBuilder";
import { SelectBuilderParams } from "../sqlQueryBuilder";
import { DbHelpers } from "../dbHelpers";
import { QueryStrategy } from "../queryStrategy";

export type SelectParams = SelectBuilderParams & {
    filtersParams: unknown[];
};

export type Pagination = {
    limit: number;
    offset: number;
};

/**
 * DTO is the interface of the data transfer object.
 * PK is the type of the primary key (a singular value).
 */
export abstract class Repository<DTO, PK> {
    protected queryBuilder: SqlQueryBuilder;

    protected constructor(protected db: Database, queryStrategy: QueryStrategy) {
        this.queryBuilder = new SqlQueryBuilder(queryStrategy);
    }

    /**
     * Takes a row object values in the exact order as they are returned by the database query
     * and returns an object with interface DTO.
     * Note that the actual object may have more properties.
     * For example, when the base SELECT returns a joined table, e.g. for Store_Product which needs its Product's name.
     */
    protected abstract castToOutput(row: Object): DTO;

    /**
     * Builds a parameter array for INSERT / UPDATE queries from a DTO.
     */
    protected abstract castToParamsArray(dto: DTO): unknown[];

    public async select(params: SelectParams = { filters: [], order: null, filtersParams: [] }, pagination: Pagination = { limit: 20, offset: 0 }): Promise<DTO[]> {
        let queryParams = params.filtersParams;
        queryParams.push(pagination.limit);
        queryParams.push(pagination.offset);
        const rows = await DbHelpers.select(this.db, this.queryBuilder.buildSelect(params), "Selected from DB", queryParams);
        return rows.map(this.castToOutput);
    }

    /**
     * Will return the first of the results.
     * As such, does not take in sorting or pagination settings.
     * It is recommended to use this method when you know that only one row will be returned.
     */
    public async selectFirst(params: { filters: string[]; filtersParams: unknown[] }): Promise<DTO> {
        const ms = await this.select({ filters: params.filters, order: null, filtersParams: params.filtersParams }, { limit: 1, offset: 0 });
        return ms[0];
    }

    public insert(dto: DTO): Promise<void> {
        return DbHelpers.run(this.db, this.queryBuilder.buildInsert(), "Inserted row into DB", this.castToParamsArray(dto));
    }
    /**
     * The row must contain the primary key.
     * Other values will be overwritten with the values from this object.
     */
    public update(primaryKey: PK, dto: DTO): Promise<void> {
        return DbHelpers.run(this.db, this.queryBuilder.buildUpdate(), "Updated row", [...this.castToParamsArray(dto), primaryKey]);
    }

    public delete(primaryKey: PK): Promise<void> {
        return DbHelpers.run(this.db, this.queryBuilder.buildDelete(), "Deleted row", [primaryKey]);
    }
}
