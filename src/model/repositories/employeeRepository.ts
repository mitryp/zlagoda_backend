import {Database} from "sqlite3";
import {Repository} from "./repository";
import {EmployeePK, IEmployeeInput, IEmployeeOutput, IUser} from "../data_types/employee";
import {QueryStrategy} from "../queryStrategy";
import {sql} from "../dbHelpers";

const EMPLOYEE_QUERY_STRATEGY: QueryStrategy = {
    selectStrategy: {
        baseClause: sql`
            SELECT id_employee, empl_name, empl_patronymic, empl_surname, empl_role, salary, date_of_start, date_of_birth, phone_number, city, street, zip_code, login
            FROM Employee
            WHERE TRUE`,
        filteringStrategy: {
            idFilter: sql`
                AND id_employee = ?`,
            roleFilter: sql`
                AND role = ?`,
            surnameFilter: sql`
                AND lower(empl_surname) LIKE '%' || lower(?) || '%'`,
        },
        sortingStrategy: {
            surnameOrder: {
                asc: sql`
                    ORDER BY empl_surname ASC`,
                desc: sql`
                    ORDER BY empl_surname DESC`,
            },
        },
        pagination: sql`
            LIMIT ? OFFSET ?`,
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
            password_hash = NULLIF(?, password_hash)
        WHERE id_employee = ?`,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    deleteStrategy: sql`
        DELETE FROM Employee
        WHERE id_employee = ?`,

    /**
     * Selects a specific user by login.
     */
    userSelectStrategy: sql`
        SELECT id_employee, login, empl_role, empl_name, empl_patronymic, empl_surname, password_hash
        FROM Employee
        WHERE login = ?`,
    // password hash is selected separately from the rest of the user's data
    userPasswordHashSelectStrategy: sql`
        SELECT password_hash
        FROM Employee
        WHERE login = ?`,
};

export class EmployeeRepository extends Repository<EmployeePK, IEmployeeInput, IEmployeeOutput> {
    constructor(db: Database) {
        super(db, EMPLOYEE_QUERY_STRATEGY);
    }

    protected castToOutput(row: Object): IEmployeeOutput {
        return {
            employeeId: row["id_employee"],
            name: {
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

    protected castToParamsArray(dto: IEmployeeInput): [string, string, string | null, string, string, number, number, number, string, string, string, string, string, string | null] {
        return [
            dto.employeeId,
            dto.name.firstName,
            dto.name.middleName, // may be null
            dto.name.lastName,
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
        const row: Object = await this.specializedSelectFirst("userSelectStrategy", [login]);
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

    public async selectUserPasswordHash(login: string): Promise<string> {
        const row: Object = await this.specializedSelectFirst("userPasswordHashSelectStrategy", [login]);
        return row ? row["password_hash"] : null;
    }
}
