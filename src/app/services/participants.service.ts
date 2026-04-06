import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { Participant, ParticipantInsert, ParticipantUpdate } from '../models/participant';

@Injectable({ providedIn: 'root' })
export class ParticipantsService {

    /**
     * Get all participants for a specific bill
     */
    async listParticipants(billId: string): Promise<{ data: Participant[] | null; error: any }> {
        return supabase
            .from('participants')
            .select('*')
            .eq('bill_id', billId)
            .order('created_at', { ascending: true });
    }

    /**
     * Get a single participant by ID
     */
    async getParticipant(participantId: string): Promise<{ data: Participant | null; error: any }> {
        return supabase
            .from('participants')
            .select('*')
            .eq('id', participantId)
            .single();
    }

    /**
     * Add a participant to a bill
     */
    async addParticipant(participant: ParticipantInsert): Promise<{ data: Participant | null; error: any }> {
        return supabase
            .from('participants')
            .insert(participant)
            .select()
            .single();
    }

    /**
     * Update a participant
     */
    async updateParticipant(
        participantId: string,
        updates: ParticipantUpdate
    ): Promise<{ data: Participant | null; error: any }> {
        return supabase
            .from('participants')
            .update(updates)
            .eq('id', participantId)
            .select()
            .single();
    }

    /**
     * Remove a participant from a bill
     */
    async removeParticipant(participantId: string): Promise<{ error: any }> {
        return supabase
            .from('participants')
            .delete()
            .eq('id', participantId);
    }
}
