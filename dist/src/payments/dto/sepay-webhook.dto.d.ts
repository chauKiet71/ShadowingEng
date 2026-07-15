export declare class SepayWebhookDto {
    id: number;
    gateway: string;
    transactionDate: string;
    accountNumber: string;
    subAccount?: string | null;
    code?: string | null;
    content: string;
    transferType: 'in' | 'out';
    description?: string;
    transferAmount: number;
    accumulated: number;
    referenceCode?: string;
}
