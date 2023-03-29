
// Generic class for all data classes corresponding to the database classes
export abstract class Model {
    // Takes the values in exact same order as returned from the database table.
    protected constructor(values: unknown[]) {
    }

    // Returns the primary key of the model.
    public abstract primaryKey(): unknown;

    // Returns the values of the model class for using in INSERT or UPDATE statements.
    public abstract insertValues(): unknown[];
}
