export interface Charge {
    bill_id: string;
    tax_cents: number;
    tip_cents: number;
    discount_cents: number;
}

export interface ChargeInsert {
    bill_id: string;
    tax_cents?: number;
    tip_cents?: number;
    discount_cents?: number;
}

export interface ChargeUpdate {
    tax_cents?: number;
    tip_cents?: number;
    discount_cents?: number;
}
