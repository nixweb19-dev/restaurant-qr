# LSEMD Master Template - Supabase Veritabanı Şeması

Bu proje "Master Template" mantığıyla çalıştığından her restoranın tamamen kendi Supabase projesi olacaktır.
Yeni bir projeye sadece aşağıdaki temel tabloları kurmak yeterlidir. (Menü ürünleri artık `config.js` üzerinden yönetilmektedir, veritabanına gerek yoktur).

```sql
-- 1. MASALAR (Tables)
CREATE TABLE public.tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'available', -- available, occupied
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SİPARİŞLER (Orders)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL,
    items JSONB NOT NULL,
    total_price NUMERIC NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, preparing, completed, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. GARSON ÇAĞRILARI (Waiter Calls)
CREATE TABLE public.waiter_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) KURALLARI
-- Master Template'de giriş sistemi (login) Supabase Auth yerine basit bir frontend şifresiyle yapıldığı için RLS kuralları tamamen açıktır.
-- Gerekirse Supabase Dashboard üzerinden Anon Key kısıtlaması yapabilirsiniz.

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

-- Tam Erişim İzinleri
CREATE POLICY "Public All Tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Waiter Calls" ON public.waiter_calls FOR ALL USING (true) WITH CHECK (true);
```
