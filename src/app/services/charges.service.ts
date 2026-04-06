import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { Charge, ChargeInsert, ChargeUpdate } from '../models/charge';

@Injectable({
    providedIn: 'root'
})
export class ChargesService {

    async getCharges(billId: string) {
        return supabase
            .from('charges')
            .select('*')
            .eq('bill_id', billId)
            .single();
    }

    async createCharges(charge: ChargeInsert) {
        return supabase
            .from('charges')
            .insert({
                bill_id: charge.bill_id,
                tax_cents: charge.tax_cents ?? 0,
                tip_cents: charge.tip_cents ?? 0,
                discount_cents: charge.discount_cents ?? 0
            })
            .select()
            .single();
    }

    async updateCharges(billId: string, update: ChargeUpdate) {
        return supabase
            .from('charges')
            .update(update)
            .eq('bill_id', billId)
            .select()
            .single();
    }

    async upsertCharges(charge: ChargeInsert) {
        // Try to update first, if no rows affected, insert
        const { data: existing } = await this.getCharges(charge.bill_id);

        if (existing) {
            return this.updateCharges(charge.bill_id, {
                tax_cents: charge.tax_cents,
                tip_cents: charge.tip_cents,
                discount_cents: charge.discount_cents
            });
        } else {
            return this.createCharges(charge);
        }
    }

    async deleteCharges(billId: string) {
        return supabase
            .from('charges')
            .delete()
            .eq('bill_id', billId);
    }
}
