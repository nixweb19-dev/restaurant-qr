// Supabase CDN üzerinden projeye dahil ediliyor (index.html'deki script)
// import { createClient } from '@supabase/supabase-js'; // (cPanel'de bu satır kullanılmaz)

/* 
  -------------------------------------------------------------
  ÖNEMLİ: cPanel'e yüklediğiniz için artık .env dosyası 
  kullanılamaz. Supabase bağlantınızın çalışması için aşağıdaki 
  iki tırnak ("") işaretinin içine kendi Supabase URL ve Anon 
  Key bilgilerinizi yapıştırmalısınız.
  -------------------------------------------------------------
*/

const supabaseUrl = "https://ansbueqjqezghtbmhqtw.supabase.co";
const supabaseAnonKey = "sb_publishable_deP59WRC7Gm4KK7CGbTOvg_-Cn02H-p";

if (supabaseUrl.includes("BURAYA")) {
  alert("LÜTFEN DİKKAT: js/supabaseClient.js dosyasına girip Supabase URL ve Key bilgilerinizi ekleyin!");
}

export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
