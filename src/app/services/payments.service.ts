import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { Payment, PaymentInsert, PaymentUpdate } from '../models/payment';

@Injectable({ providedIn: 'root' })
export class PaymentsService {

    /**
     * Get all payments for a specific bill
     */
    async listPayments(billId: string): Promise<{ data: Payment[] | null; error: any }> {
        return supabase
            .from('payments')
            .select('*')
            .eq('bill_id', billId)
            .order('created_at', { ascending: true });
    }

    /**
     * Get payments by participant
     */
    async getPaymentsByParticipant(participantId: string): Promise<{ data: Payment[] | null; error: any }> {
        return supabase
            .from('payments')
            .select('*')
            .eq('participant_id', participantId);
    }

    /**
     * Add a payment
     */
    async addPayment(payment: PaymentInsert): Promise<{ data: Payment | null; error: any }> {
        return supabase
            .from('payments')
            .insert(payment)
            .select()
            .single();
    }

    /**
     * Update a payment
     */
    async updatePayment(
        paymentId: string,
        updates: PaymentUpdate
    ): Promise<{ data: Payment | null; error: any }> {
        return supabase
            .from('payments')
            .update(updates)
            .eq('id', paymentId)
            .select()
            .single();
    }

    /**
     * Remove a payment
     */
    async removePayment(paymentId: string): Promise<{ error: any }> {
        return supabase
            .from('payments')
            .delete()
            .eq('id', paymentId);
    }

    /**
     * Get total payments for a bill
     */
    async getBillPaymentsTotal(billId: string): Promise<{ total: number; error: any }> {
        const { data, error } = await supabase
            .from('payments')
            .select('amount_cents')
            .eq('bill_id', billId);

        if (error) return { total: 0, error };

        const total = (data ?? []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);
        return { total, error: null };
    }
}
