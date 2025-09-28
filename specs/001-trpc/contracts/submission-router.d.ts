import { z } from 'zod';
declare const SubmissionSchema: any;
declare const CreateSubmissionInputSchema: any;
declare const GetFormSubmissionsInputSchema: any;
declare const UpdateSubmissionInputSchema: any;
export declare const submissionRouterContracts: {
    create: {
        input: any;
        output: any;
        error: any;
    };
    getById: {
        input: any;
        output: any;
        error: any;
    };
    getByFormId: {
        input: any;
        output: any;
        error: any;
    };
    update: {
        input: any;
        output: any;
        error: any;
    };
    delete: {
        input: any;
        output: any;
        error: any;
    };
    getStats: {
        input: any;
        output: any;
        error: any;
    };
    bulkDelete: {
        input: any;
        output: any;
        error: any;
    };
};
export declare const submissionRouterTestCases: {
    createSubmission: {
        validInput: {
            formId: string;
            data: {
                name: string;
                email: string;
                age: number;
            };
            userAgent: string;
        };
        invalidInput: {
            formId: string;
            data: {};
        };
    };
    getFormSubmissions: {
        validInput: {
            formId: string;
            limit: number;
            startDate: Date;
        };
        invalidInput: {
            formId: string;
            limit: number;
        };
    };
};
export type Submission = z.infer<typeof SubmissionSchema>;
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionInputSchema>;
export type GetFormSubmissionsInput = z.infer<typeof GetFormSubmissionsInputSchema>;
export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionInputSchema>;
export default submissionRouterContracts;
//# sourceMappingURL=submission-router.d.ts.map