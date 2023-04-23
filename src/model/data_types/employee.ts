export type EmployeePosition = "cashier" | "manager";

export interface IEmployeeOutput {
    employeeId: EmployeePK;
    name: {
        firstName: string;
        middleName: null | string;
        lastName: string;
    };
    position: EmployeePosition;
    salary: number;
    workStartDate: number;
    birthDate: number;
    phone: string;
    address: {
        city: string;
        street: string;
        index: string;
    };
    login: string;
}

export interface IEmployeeInput {
    employeeId: EmployeePK;
    name: {
        firstName: string;
        middleName: null | string;
        lastName: string;
    };
    position: EmployeePosition;
    salary: number;
    workStartDate: number;
    birthDate: number;
    phone: string;
    address: {
        city: string;
        street: string;
        index: string;
    };
    login: string;
    password: null | string; // password is only ever input, proceeds to be hashed by bcrypt, and is never output again, so it is not in the output interface
}

export type EmployeePK = string;

// users are employees and employees are users
export interface IUser {
    userId: string;
    login: string;
    role: EmployeePosition;
    name: {
        firstName: string;
        middleName: null | string;
        lastName: string;
    };

    // authorization information
    // password_hash is only present when backend is validating the token
    token?: string;
    password_hash?: string;
}
