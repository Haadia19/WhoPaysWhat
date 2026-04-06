export interface Payment {
    id: string;
    bill_id: string;
    participant_id: string;
    amount_cents: number;
    created_at: string;
}

export interface PaymentInsert {
    bill_id: string;
    participant_id: string;
    amount_cents: number;
}

export interface PaymentUpdate {
    amount_cents?: number;
}
