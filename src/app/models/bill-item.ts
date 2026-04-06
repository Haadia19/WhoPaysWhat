export interface BillItem {
    id: string;
    bill_id: string;
    name: string;
    price: number;
    created_at: string;
}

export interface BillItemInsert {
    bill_id: string;
    name: string;
    price: number;
}

export interface BillItemUpdate {
    name?: string;
    price?: number;
}
