import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { User, Session } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private currentUser = new BehaviorSubject<User | null>(null);
    private currentSession = new BehaviorSubject<Session | null>(null);

    user$ = this.currentUser.asObservable();
    session$ = this.currentSession.asObservable();

    constructor() {
        this.initializeAuth();
    }

    private async initializeAuth() {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        this.currentSession.next(session);
        this.currentUser.next(session?.user ?? null);

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            this.currentSession.next(session);
            this.currentUser.next(session?.user ?? null);
        });
    }

    async signUp(email: string, password: string): Promise<{ error: any }> {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { error };
    }

    async signIn(email: string, password: string): Promise<{ error: any }> {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    }

    async signOut(): Promise<{ error: any }> {
        const { error } = await supabase.auth.signOut();
        return { error };
    }

    async resetPassword(email: string): Promise<{ error: any }> {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return { error };
    }

    get isLoggedIn(): boolean {
        return this.currentUser.value !== null;
    }

    get user(): User | null {
        return this.currentUser.value;
    }
}
