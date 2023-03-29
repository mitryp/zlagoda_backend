import {Database} from "sqlite3";
import {SqlQueryBuilder} from "../sqlQueryBuilder";
import {SelectBuilderParams} from "../sqlQueryBuilder";
import {DbHelpers} from "../dbHelpers";
import {Model} from "../data_types/model";
import {QueryStrategy} from "../queryStrategy";

export type SelectParams = SelectBuilderParams & {
    params: unknown[]
}

export abstract class Repository<M extends Model> {
    protected queryBuilder: SqlQueryBuilder;

    protected constructor(protected db: Database, queryStrategy: QueryStrategy) {
        this.queryBuilder = new SqlQueryBuilder(queryStrategy);
    }

    // Takes an array of values in the exact order as they are returned by the database query
    // and returns the Model class M.
    protected abstract castToModel(row: unknown[]): M;

    public select(params: SelectParams = {isSorting: false, params: []}): Promise<M[]> {
        return DbHelpers.select(
            this.db,
            this.queryBuilder.buildSelect(params),
            "Selected from DB",
            params.params,
        ).then(rows => rows.map(this.castToModel));
    }

    // Will return the first of the results.
    // It is recommended to use this method when you know that only one row will be returned.
    public selectFirst(params: SelectParams = {isSorting: false, params: []}): Promise<M> {
        return this.select(params).then(ms => ms[0]);
    }

    public selectOne(primaryKey: unknown): Promise<M> {
        return DbHelpers.select(this.db,
            this.queryBuilder.buildSelectOne(),
            "Selected single from DB",
            [primaryKey],
        )
            .then(rows => rows.map(this.castToModel))
            .then(ms => ms[0]);
    }

    public insert(row: M): Promise<void> {
        return DbHelpers.run(this.db,
            this.queryBuilder.buildInsert(),
            "Inserted row into DB",
            row.insertValues(),
        );
    }

    // The row must contain the primary key.
    // Other values will be overwritten with the values from this object.
    public update(row: M): Promise<void> {
        return DbHelpers.run(this.db,
            this.queryBuilder.buildUpdate(),
            "Updated row",
            [...row.insertValues(), row.primaryKey()]
        );
    }

    public delete(primaryKey: unknown): Promise<void> {
        return DbHelpers.run(this.db,
            this.queryBuilder.buildDelete(),
            "Deleted row",
            [primaryKey],
        );
    }
}

