import * as assert from "assert";
import { QueryStrategy, SelectStrategy, FilteringStrategy } from "./queryStrategy";

export type SelectBuilderParams = {
    /**
     * Keys that specify filter clauses to be used.
     * SelectStrategy that will be used by the builder must have filters with these keys.
     */
    filters: string[];
    order: OrderParam;
};

export type OrderParam = {
    /**
     * String key in SortingStrategy.
     */
    key: string;
    asc: boolean;
};

export class SqlQueryBuilder {
    public constructor(protected queryStrategy: QueryStrategy) {}

    protected buildSelectFilters(filters: string[]): string {
        const filteringStrategy: FilteringStrategy = this.queryStrategy.selectStrategy.filteringStrategy;
        let result: string = "";
        filters.forEach((filter) => {
            result += "\n" + filteringStrategy[filter];
        });
        return result;
    }

    public buildSelect(
        params: SelectBuilderParams = {
            filters: [],
            order: null,
        } as SelectBuilderParams,
        customSQLFilters: string = null
    ): string {
        const selectStrategy: SelectStrategy = this.queryStrategy.selectStrategy;

        let query: string = selectStrategy.baseClause;
        query += customSQLFilters ?? this.buildSelectFilters(params.filters);
        if (params.order !== null) query += "\n" + selectStrategy.sortingStrategy[params.order.key][params.order.asc ? "asc" : "desc"];
        query += ";";

        console.log("Built SELECT query:\n" + query);

        return query;
    }

    public buildInsert(): string {
        return this.queryStrategy.insertStrategy + ";";
    }

    public buildUpdate(): string {
        return this.queryStrategy.updateStrategy + ";";
    }

    public buildDelete(): string {
        return this.queryStrategy.deleteStrategy + ";";
    }

    public buildCustomQuery(key: string): string {
        assert(key.endsWith("QueryStrategy")); // to prevent accidents during development
        return this.queryStrategy[key] + ";";
    }
}
