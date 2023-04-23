import { Database } from "sqlite3";
import { IUser } from "../../model/data_types/employee";
import { EmployeeRepository } from "../../model/repositories/employeeRepository";
import { validatePassword } from "./auth_utils";
import { TokenStorage } from "./tokenStorage";

export class AuthenticationService {
    employeeRepository: EmployeeRepository;

    constructor(db: Database, private readonly sessionStorage: TokenStorage) {
        this.employeeRepository = new EmployeeRepository(db);
    }

    async login(login: string, password: string): Promise<IUser | null> {
        const user = await this.employeeRepository.selectUser(login);

        if (!user || !(await validatePassword(password, user.password_hash!))) return null;

        user.token = await this.sessionStorage.issueToken(user);
        user.password_hash = undefined;

        return user;
    }

    async validateToken(token: string): Promise<IUser | null> {
        return this.sessionStorage.validateToken(token);
    }

    // Use when Employee has been changed to force them to login again.
    async logout(userId: string): Promise<void> {
        return this.sessionStorage.withdrawTokensOfUser(userId);
    }
}
