import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { BillItem, BillItemInsert, BillItemUpdate } from '../models/bill-item';

@Injectable({ providedIn: 'root' })
export class BillItemsService {

    /**
     * Get all items for a specific bill
     */
    async listItems(billId: string): Promise<{ data: BillItem[] | null; error: any }> {
        return supabase
            .from('items')
            .select('*')
            .eq('bill_id', billId)
            .order('created_at', { ascending: true });
    }

    /**
     * Get a single item by ID
     */
    async getItem(itemId: string): Promise<{ data: BillItem | null; error: any }> {
        return supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .single();
    }

    /**
     * Add an item to a bill
     */
    async addItem(item: BillItemInsert): Promise<{ data: BillItem | null; error: any }> {
        return supabase
            .from('items')
            .insert(item)
            .select()
            .single();
    }

    /**
     * Update an item
     */
    async updateItem(
        itemId: string,
        updates: BillItemUpdate
    ): Promise<{ data: BillItem | null; error: any }> {
        return supabase
            .from('items')
            .update(updates)
            .eq('id', itemId)
            .select()
            .single();
    }

    /**
     * Remove an item from a bill
     */
    async removeItem(itemId: string): Promise<{ error: any }> {
        return supabase
            .from('items')
            .delete()
            .eq('id', itemId);
    }

    /**
     * Get total amount for a bill
     */
    async getBillTotal(billId: string): Promise<{ total: number; error: any }> {
        const { data, error } = await supabase
            .from('items')
            .select('price')
            .eq('bill_id', billId);

        if (error) return { total: 0, error };

        const total = (data ?? []).reduce((sum, item) => sum + (item.price || 0), 0);
        return { total, error: null };
    }
}
