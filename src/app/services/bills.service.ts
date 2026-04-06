import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { Bill, BillUpdate } from '../models/bill';

@Injectable({ providedIn: 'root' })
export class BillsService {

    /**
     * Get all bills the current user can access.
     * RLS will automatically ensure:
     * - owner sees their bills
     * - participants see shared bills
     */
    async listBills(): Promise<{ data: Bill[] | null; error: any }> {
        return supabase
            .from('bills')
            .select('id, title, currency, created_at')
            .order('created_at', { ascending: false });
    }

    /**
     * Get a single bill by ID
     */
    async getBill(billId: string): Promise<{ data: Bill | null; error: any }> {
        return supabase
            .from('bills')
            .select('*')
            .eq('id', billId)
            .single();
    }

    /**
     * Create a new bill
     * owner_id will be auto-filled by RLS check (auth.uid())
     */
    async createBill(title: string, currency = 'PKR'): Promise<{ data: Bill | null; error: any }> {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: { message: 'Not authenticated' } };
        }

        return supabase
            .from('bills')
            .insert({
                title,
                currency,
                owner_id: user.id,
            })
            .select()
            .single();
    }

    /**
     * Update bill title or currency
     */
    async updateBill(
        billId: string,
        updates: BillUpdate
    ): Promise<{ data: Bill | null; error: any }> {
        return supabase
            .from('bills')
            .update(updates)
            .eq('id', billId)
            .select()
            .single();
    }

    /**
     * Delete a bill
     * (cascade deletes participants, items, charges, etc.)
     */
    async deleteBill(billId: string): Promise<{ data: Bill | null; error: any }> {
        return supabase
            .from('bills')
            .delete()
            .eq('id', billId)
            .select()
            .single();
    }
}
