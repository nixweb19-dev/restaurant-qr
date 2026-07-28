import { CONFIG } from './config.js';

const supabaseUrl = CONFIG.SUPABASE_URL;
const supabaseAnonKey = CONFIG.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  alert("LÜTFEN DİKKAT: js/config.js dosyasına girip Supabase URL ve Key bilgilerinizi ekleyin!");
}

export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
