import * as assert from "assert";
import { StaticQueryStrategy, QueryStrategy, SelectStrategy, FilteringStrategy } from "./queryStrategy";

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

export class StaticSqlQueryBuilder {
    public constructor(protected staticQueryStrategy: StaticQueryStrategy) {}

    protected buildSelectFilters(filteringStrategy: FilteringStrategy, filters: string[]): string {
        let result: string = "";
        filters.forEach((filter) => {
            result += "\n    " + filteringStrategy[filter];
        });
        return result;
    }

    public buildSelect(
        params: SelectBuilderParams = {
            filters: [],
            order: null,
        } as SelectBuilderParams
    ): string {
        return this.buildSelectFromStrategy(this.staticQueryStrategy.selectStrategy, params);
    }

    public buildInsert(): string {
        return this.staticQueryStrategy.insertStrategy + ";";
    }

    public buildDelete(): string {
        return this.staticQueryStrategy.deleteStrategy + ";";
    }

    public buildCustomQuery(key: string): string {
        assert(key.endsWith("QueryStrategy")); // to prevent accidents during development
        return this.staticQueryStrategy[key] + ";";
    }

    // to reuse appropriate mechanisms in specialized queries with optional filters
    public buildCustomFilteredSelect(key: string,
        params: SelectBuilderParams = {
            filters: [],
            order: null,
        } as SelectBuilderParams
    ): string {
        assert(key.endsWith("FilteredSelectStrategy"));
        return this.buildSelectFromStrategy(this.staticQueryStrategy[key], params);
    }

    protected buildSelectFromStrategy(
        selectStrategy: SelectStrategy,
        params: SelectBuilderParams = {
            filters: [],
            order: null,
        } as SelectBuilderParams
    ): string {
        let query: string = selectStrategy.baseClause;
        query += this.buildSelectFilters(selectStrategy.filteringStrategy, params.filters);
        if (params.order !== null) query += "\n" + selectStrategy.sortingStrategy[params.order.key][params.order.asc ? "asc" : "desc"];
        query += ";";

        console.log("Built SELECT query:\n" + query);

        return query;
    }
}

export class SqlQueryBuilder extends StaticSqlQueryBuilder {
    constructor(protected queryStrategy: QueryStrategy) {
        super(queryStrategy); // passes the reference polymorphically to super as a static strategy, while reserving another, regular queryStrategy reference for accessing update
    }

    public buildUpdate(): string {
        return this.queryStrategy.updateStrategy + ";";
    }
}
