import { z } from 'zod';
declare const UserSchema: any;
declare const LoginInputSchema: any;
declare const RegisterInputSchema: any;
declare const CreateUserInputSchema: any;
declare const AuthResponseSchema: any;
export declare const authRouterContracts: {
    login: {
        input: any;
        output: any;
        error: any;
    };
    register: {
        input: any;
        output: any;
        error: any;
    };
    refreshToken: {
        input: any;
        output: any;
        error: any;
    };
    changePassword: {
        input: any;
        output: any;
        error: any;
    };
    forgotPassword: {
        input: any;
        output: any;
        error: any;
    };
    resetPassword: {
        input: any;
        output: any;
        error: any;
    };
    me: {
        input: any;
        output: any;
        error: any;
    };
    updateProfile: {
        input: any;
        output: any;
        error: any;
    };
    logout: {
        input: any;
        output: any;
        error: any;
    };
    createUser: {
        input: any;
        output: any;
        error: any;
    };
    listUsers: {
        input: any;
        output: any;
        error: any;
    };
    updateUser: {
        input: any;
        output: any;
        error: any;
    };
    deleteUser: {
        input: any;
        output: any;
        error: any;
    };
};
export declare const authRouterTestCases: {
    login: {
        validInput: {
            email: string;
            password: string;
            rememberMe: boolean;
        };
        invalidInput: {
            email: string;
            password: string;
        };
    };
    register: {
        validInput: {
            email: string;
            password: string;
            name: string;
        };
        invalidInput: {
            email: string;
            password: string;
            name: string;
        };
    };
    createUser: {
        validInput: {
            email: string;
            name: string;
            role: "ADMIN";
        };
        invalidInput: {
            email: string;
            role: any;
        };
    };
};
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export default authRouterContracts;
//# sourceMappingURL=auth-router.d.ts.map