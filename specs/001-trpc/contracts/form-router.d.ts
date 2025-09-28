import { z } from 'zod';
declare const FormMetadataSchema: any;
declare const FormSchema: any;
declare const CreateFormInputSchema: any;
declare const UpdateFormInputSchema: any;
declare const ListFormsInputSchema: any;
export declare const formRouterContracts: {
    list: {
        input: any;
        output: any;
        error: any;
    };
    getById: {
        input: any;
        output: any;
        error: any;
    };
    create: {
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
    getSubmissions: {
        input: any;
        output: any;
        error: any;
    };
};
export declare const formRouterTestCases: {
    createForm: {
        validInput: {
            name: string;
            description: string;
            metadata: {
                version: string;
                fields: {
                    id: string;
                    name: string;
                    type: string;
                    label: string;
                    required: boolean;
                }[];
            };
        };
        invalidInput: {
            name: string;
            metadata: {
                version: string;
                fields: never[];
            };
        };
    };
    listForms: {
        validInput: {
            limit: number;
            search: string;
        };
        invalidInput: {
            limit: number;
        };
    };
};
export type Form = z.infer<typeof FormSchema>;
export type FormMetadata = z.infer<typeof FormMetadataSchema>;
export type CreateFormInput = z.infer<typeof CreateFormInputSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormInputSchema>;
export type ListFormsInput = z.infer<typeof ListFormsInputSchema>;
export default formRouterContracts;
//# sourceMappingURL=form-router.d.ts.map