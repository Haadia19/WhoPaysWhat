import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { ItemConsumer, ItemConsumerInsert } from '../models/item-consumer';

@Injectable({ providedIn: 'root' })
export class ItemConsumersService {

    /**
     * Get all consumers for a specific item
     */
    async getItemConsumers(itemId: string): Promise<{ data: ItemConsumer[] | null; error: any }> {
        return supabase
            .from('item_consumers')
            .select('*')
            .eq('item_id', itemId);
    }

    /**
     * Get all item consumers for a bill (via items)
     */
    async getBillItemConsumers(billId: string): Promise<{ data: any[] | null; error: any }> {
        return supabase
            .from('item_consumers')
            .select(`
                item_id,
                participant_id,
                items!inner(id, bill_id, name, price)
            `)
            .eq('items.bill_id', billId);
    }

    /**
     * Add a consumer to an item
     */
    async addConsumer(itemConsumer: ItemConsumerInsert): Promise<{ data: ItemConsumer | null; error: any }> {
        return supabase
            .from('item_consumers')
            .insert(itemConsumer)
            .select()
            .single();
    }

    /**
     * Add multiple consumers to an item
     */
    async addConsumers(itemConsumers: ItemConsumerInsert[]): Promise<{ data: ItemConsumer[] | null; error: any }> {
        return supabase
            .from('item_consumers')
            .insert(itemConsumers)
            .select();
    }

    /**
     * Remove a consumer from an item
     */
    async removeConsumer(itemId: string, participantId: string): Promise<{ error: any }> {
        return supabase
            .from('item_consumers')
            .delete()
            .eq('item_id', itemId)
            .eq('participant_id', participantId);
    }

    /**
     * Remove all consumers from an item
     */
    async removeAllConsumers(itemId: string): Promise<{ error: any }> {
        return supabase
            .from('item_consumers')
            .delete()
            .eq('item_id', itemId);
    }

    /**
     * Set consumers for an item (replace all existing)
     */
    async setItemConsumers(itemId: string, participantIds: string[]): Promise<{ error: any }> {
        // First remove all existing
        const { error: deleteError } = await this.removeAllConsumers(itemId);
        if (deleteError) return { error: deleteError };

        // If no participants, we're done
        if (participantIds.length === 0) return { error: null };

        // Add new consumers
        const consumers = participantIds.map(pid => ({
            item_id: itemId,
            participant_id: pid
        }));

        const { error } = await supabase
            .from('item_consumers')
            .insert(consumers);

        return { error };
    }
}
