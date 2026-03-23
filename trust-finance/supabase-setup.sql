-- =============================================
-- TRUST FINANCE - Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefono TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Solicitudes table
CREATE TABLE IF NOT EXISTS public.solicitudes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  producto TEXT NOT NULL,
  pais TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),
  nombre TEXT DEFAULT '',
  apellido TEXT DEFAULT '',
  email TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  dni TEXT DEFAULT '',
  ciudad TEXT DEFAULT '',
  nombre_negocio TEXT DEFAULT '',
  ruc TEXT DEFAULT '',
  tipo_negocio TEXT DEFAULT '',
  tiempo_operando TEXT DEFAULT '',
  ventas_mensuales TEXT DEFAULT '',
  tiene_ruc TEXT DEFAULT '',
  experiencia_importando TEXT DEFAULT '',
  frecuencia_importacion TEXT DEFAULT '',
  plazo_venta TEXT DEFAULT '',
  tiene_compradores TEXT DEFAULT '',
  como_conociste TEXT DEFAULT '',
  comentarios TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;

-- 4. Profiles policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow insert on signup
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- 5. Solicitudes policies
-- Users can view their own solicitudes
CREATE POLICY "Users can view own solicitudes"
  ON public.solicitudes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own solicitudes
CREATE POLICY "Users can insert own solicitudes"
  ON public.solicitudes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all solicitudes
CREATE POLICY "Admins can view all solicitudes"
  ON public.solicitudes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can update all solicitudes (change estado)
CREATE POLICY "Admins can update all solicitudes"
  ON public.solicitudes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- 6. Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, apellido, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger to call function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create admin user (you can change this email later)
-- This will mark any user with this email as admin when they sign up
-- After you sign up with admin@trust.com, run this:
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'admin@trust.com';
