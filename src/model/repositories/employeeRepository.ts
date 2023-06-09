import { Database } from "better-sqlite3";
import { Repository } from "./repository";
import { EmployeePK, IEmployeeInput, IEmployeeOutput, IUser } from "../data_types/employee";
import { QueryStrategy } from "../queryStrategy";
import { sql } from "../dbHelpers";
import { IShort } from "../data_types/general";

const EMPLOYEE_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT id_employee, empl_name, empl_patronymic, empl_surname, empl_role, salary, date_of_start, date_of_birth, phone_number, city, street, zip_code, login
            FROM Employee
            WHERE TRUE`,
        filteringStrategy: {
            primaryKeyFilter: sql`
                AND id_employee = ?`,
            positionFilter: sql`
                AND empl_role = ?`,
            employeeSurnameFilter: sql`
                AND lower(empl_surname) LIKE '%' || lower(?) || '%'`,
        },
        sortingStrategy: {
            employeeSurnameOrder: {
                asc: sql`
                    ORDER BY empl_surname ASC`,
                desc: sql`
                    ORDER BY empl_surname DESC`,
            },
        },
    },
    // null value in password_hash parameter is an explicit indication that password should not be updated
    // the client cannot simply pass the current value as with other similar scenarios, since the current password hash is not available on the client
    updateStrategy: sql`
        UPDATE Employee
        SET id_employee = ?,
            empl_name = ?,
            empl_patronymic = ?,
            empl_surname = ?,
            empl_role = ?,
            salary = ?,
            date_of_start = ?,
            date_of_birth = ?,
            phone_number = ?,
            city = ?,
            street = ?,
            zip_code = ?,
            login = ?,
            password_hash = COALESCE(?, password_hash)
        WHERE id_employee = ?
        RETURNING id_employee`,
    insertStrategy: sql`
        INSERT INTO Employee (
            id_employee,
            empl_name,
            empl_patronymic,
            empl_surname,
            empl_role,
            salary,
            date_of_start,
            date_of_birth,
            phone_number,
            city,
            street,
            zip_code,
            login,
            password_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id_employee`,
    deleteStrategy: sql`
        DELETE FROM Employee
        WHERE id_employee = ?`,

    /**
     * Selects a specific user by login.
     */
    userSelectQueryStrategy: sql`
        SELECT id_employee, login, empl_role, empl_name, empl_patronymic, empl_surname, password_hash
        FROM Employee
        WHERE login = ?`,
    // for selecting cashier in receipt filtering
    cashierShortSelectQueryStrategy: sql`
        SELECT id_employee, (empl_surname || ' ' || empl_name || (COALESCE(' ' || empl_patronymic, ''))) AS empl_fullname
        FROM Employee
        WHERE empl_role = 'cashier'`,

    // Popov group by
    bestCashiersQueryStrategy: sql`
        SELECT Employee.id_employee, Employee.empl_surname, Employee.empl_name, COUNT(DISTINCT Store_Product.UPC) as num_products_sold
        FROM Employee
        INNER JOIN Receipt ON Employee.id_employee = Receipt.id_employee
        INNER JOIN Sale ON Receipt.receipt_number = Sale.receipt_number
        INNER JOIN Store_Product ON Sale.id_store_product = Store_Product.id_store_product
        GROUP BY Employee.id_employee, Employee.empl_surname, Employee.empl_name
        HAVING COUNT(DISTINCT Store_Product.UPC) >= ?`,
};

export class EmployeeRepository extends Repository<EmployeePK, IEmployeeInput, IEmployeeOutput> {
    constructor(db: Database) {
        super(db, EMPLOYEE_QUERY_STRATEGY);
    }

    public async bestCashiers(minSales: number): Promise<Object[]> {
        return this.specializedSelect("bestCashiersQueryStrategy", [minSales]);
    }

    public async cashiersInShort(): Promise<IShort[]> {
        const rows = await this.specializedSelect("cashierShortSelectQueryStrategy");
        return rows.map((row) => {
            return { primaryKey: row["id_employee"], descriptiveAttr: row["empl_fullname"] };
        });
    }

    protected castToOutput(row: Object): IEmployeeOutput {
        return {
            employeeId: row["id_employee"],
            employeeName: {
                firstName: row["empl_name"],
                middleName: row["empl_patronymic"],
                lastName: row["empl_surname"],
            },
            position: row["empl_role"],
            salary: row["salary"],
            workStartDate: row["date_of_start"],
            birthDate: row["date_of_birth"],
            phone: row["phone_number"],
            address: {
                city: row["city"],
                street: row["street"],
                index: row["zip_code"],
            },
            login: row["login"],
        };
    }

    protected castToParamsArray(dto: IEmployeeInput): [EmployeePK, string, string | null, string, string, number, number, number, string, string, string, string, string, string | null] {
        return [
            dto.employeeId,
            dto.employeeName.firstName,
            dto.employeeName.middleName, // may be null
            dto.employeeName.lastName,
            dto.position,
            dto.salary,
            dto.workStartDate,
            dto.birthDate,
            dto.phone,
            dto.address.city,
            dto.address.street,
            dto.address.index,
            dto.login,
            dto.password, // may be null
        ];
    }

    public async selectUser(login: string): Promise<IUser | null> {
        const row: Object = await this.specializedSelectFirst("userSelectQueryStrategy", [login]);
        if (!row) return null;

        return {
            userId: row["id_employee"],
            login: row["login"],
            role: row["empl_role"],
            name: {
                firstName: row["empl_name"],
                middleName: row["empl_patronymic"],
                lastName: row["empl_surname"],
            },
            password_hash: row["password_hash"],
        };
    }
}
