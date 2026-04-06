import { createClient } from '@supabase/supabase-js';
import { environment } from './environments/environment.prod';

export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);