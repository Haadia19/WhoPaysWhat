export interface Participant {
    id: string;
    bill_id: string;
    name: string;
    user_id?: string;
    created_at: string;
}

export interface ParticipantInsert {
    bill_id: string;
    name: string;
    user_id?: string;
}

export interface ParticipantUpdate {
    name?: string;
}
