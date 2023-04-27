import { IUser } from "../../model/data_types/employee";
import { generateSessionToken, newExpireDate } from "./auth_utils";

export class TokenStorage {
    // token : [User, expireDate(milliseconds)]
    private storage: { [token: string]: [IUser, number] } = {};

    async issueToken(user: IUser): Promise<string> {
        const token = await generateSessionToken();
        this.storage[token] = [user, 0];
        this.prolongToken(token);

        return token;
    }

    withdrawToken(token: string): void {
        this.storage[token] = undefined;
    }

    /**
     * Returns IUser object associated with the token if the token is valid and has not expired yet.
     * Also, prolongs the valid token.
     * Otherwise, returns null.
     *
     * If the token is valid, but it has expired, withdraws the token.
     */
    validateToken(token: string): IUser | null {
        const stored = this.storage[token];

        if (!stored || new Date(stored[1]) < new Date()) {
            if (stored) this.withdrawToken(token);
            return null;
        }

        this.prolongToken(token);
        return stored[0];
    }

    /**
     * Withdraws all tokens issued for the given userId.
     */
    withdrawTokensOfUser(userId: string): void {
        for (const token in this.storage) {
            if (this.storage[token] && this.storage[token][0].userId === userId) this.withdrawToken(token);
        }
    }

    /**
     * Prolongs the given token for env.AUTH_SESSION_TIMEOUT milliseconds starting from the current datetime.
     */
    prolongToken(token: string): void {
        if (!this.storage[token]) return;

        this.storage[token][1] = newExpireDate();
    }
}
