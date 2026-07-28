# LSEMD Master Template - Supabase Veritabanı Şeması

Bu proje "Master Template" mantığıyla çalıştığından her restoranın tamamen kendi Supabase projesi olacaktır.
Yeni bir projeye bu tabloları kurmak yeterlidir. (workspaces tablosu tamamen kaldırılmıştır).

```sql
-- 1. KATEGORİLER (Categories)
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ÜRÜNLER (Products)
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MASALAR (Tables)
CREATE TABLE public.tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'available', -- available, occupied
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SİPARİŞLER (Orders)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL,
    items JSONB NOT NULL,
    total_price NUMERIC NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, preparing, completed, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. GARSON ÇAĞRILARI (Waiter Calls)
CREATE TABLE public.waiter_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) KURALLARI
-- Herkes okuyabilir ve sipariş/çağrı oluşturabilir.
-- Sadece Authenticated (Giriş Yapmış Admin) düzenleyebilir/silebilir.

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

-- Herkese Açık Okuma / Ekleme İzinleri
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Orders (Self)" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Insert Waiter Calls" ON public.waiter_calls FOR INSERT WITH CHECK (true);

-- Authenticated (Admin) Tüm İzinler (Hepsine)
CREATE POLICY "Admin All Categories" ON public.categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Products" ON public.products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Tables" ON public.tables FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Waiter Calls" ON public.waiter_calls FOR ALL USING (auth.role() = 'authenticated');
```
