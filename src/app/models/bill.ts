export interface Bill {
    id: string;
    title: string;
    currency: string;
    created_at: string; // ISO string from Supabase
}

export interface BillUpdate {
    title?: string;
    currency?: string;
}