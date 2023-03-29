import {QueryStrategy} from "./queryStrategy";

export type SelectBuilderParams = {
    // isFiltering: boolean,
    [key: `is${string}Filtering`]: boolean
    isSorting: boolean,
}

export class SqlQueryBuilder {
    public constructor(protected queryStrategy: QueryStrategy) {
    }

    protected buildWhereClause(params: SelectBuilderParams): string {
        const filteringStrategy = this.queryStrategy.selectStrategy.filteringStrategy;

        if (params.isFiltering === true) return '\n' + filteringStrategy.filteringClause;

        // keys examples and corresponding boolean params in `params`
        // - filteringClause
        // - nameFilteringClause
        // - ageFilteringClause
        // custom keys will always end with 'FilteringClause'
        for (const key in filteringStrategy) {
            const paramKey = `is${key.replace('Clause', '')}`;
            if (params[paramKey] === true) return '\n' + filteringStrategy[key];
        }

        return '';
    }

    public buildSelect(params: SelectBuilderParams = {isFiltering: false, isSorting: false} as SelectBuilderParams, whereClause: string = null): string {
        const selectStrategy = this.queryStrategy.selectStrategy;

        let query = selectStrategy.baseClause;
        query += whereClause ?? this.buildWhereClause(params);

        if (params.isSorting) query += `\n${selectStrategy.sortingClause}`;
        query += ';';

        // log point to display the actual query
        // console.log('query', query);

        return query;
    }

    public buildSelectOne(): string {
        return this.buildSelect(null, this.queryStrategy.selectStrategy.singleRowFilterClause);
    }

    public buildInsert(): string {
        return this.queryStrategy.insertStrategy + ';';
    }

    public buildUpdate(): string {
        return this.queryStrategy.updateStrategy + ';';
    }

    public buildDelete(): string {
        return this.queryStrategy.deleteStrategy + ';';
    }
}