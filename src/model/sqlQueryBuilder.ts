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

    protected buildSelectFilters(filters: string[]): string {
        const filteringStrategy: FilteringStrategy = this.staticQueryStrategy.selectStrategy.filteringStrategy;
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
        const selectStrategy: SelectStrategy = this.staticQueryStrategy.selectStrategy;

        let query: string = selectStrategy.baseClause;
        query += customSQLFilters ?? this.buildSelectFilters(params.filters);
        if (params.order !== null) query += "\n" + selectStrategy.sortingStrategy[params.order.key][params.order.asc ? "asc" : "desc"];
        query += ";";

        console.log("Built SELECT query:\n" + query);

        return query;
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
}

export class SqlQueryBuilder extends StaticSqlQueryBuilder {
    constructor(protected queryStrategy: QueryStrategy) {
        super(queryStrategy); // passes the reference polymorphically to super as a static strategy, while reserving another, regular queryStrategy reference for accessing update
    }

    public buildUpdate(): string {
        return this.queryStrategy.updateStrategy + ";";
    }
}
