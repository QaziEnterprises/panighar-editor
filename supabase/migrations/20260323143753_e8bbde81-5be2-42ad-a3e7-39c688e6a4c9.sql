CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users can view own or admin all roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL, display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own or admin all profiles" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.profiles (user_id, email, display_name) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)); RETURN NEW; END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type TEXT NOT NULL CHECK (type IN ('customer', 'supplier')),
  name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, city TEXT,
  opening_balance NUMERIC(12,2) DEFAULT 0, current_balance NUMERIC(12,2) DEFAULT 0, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (true);

CREATE TABLE public.product_categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage categories" ON public.product_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, sku TEXT,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  purchase_price NUMERIC(12,2) DEFAULT 0, selling_price NUMERIC(12,2) DEFAULT 0,
  quantity NUMERIC(12,2) DEFAULT 0, unit TEXT DEFAULT 'pcs', alert_threshold NUMERIC(12,2) DEFAULT 0,
  brand TEXT, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete products" ON public.products FOR DELETE TO authenticated USING (true);

CREATE TABLE public.expense_categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view expense categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage expense categories" ON public.expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0, date DATE NOT NULL DEFAULT CURRENT_DATE, description TEXT,
  payment_method TEXT DEFAULT 'cash', reference_no TEXT, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), supplier_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE, reference_no TEXT, total NUMERIC(12,2) DEFAULT 0, discount NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'due' CHECK (payment_status IN ('paid', 'due', 'partial')),
  payment_method TEXT DEFAULT 'cash', notes TEXT, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view purchases" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update purchases" ON public.purchases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete purchases" ON public.purchases FOR DELETE TO authenticated USING (true);

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0, subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view purchase items" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchase items" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update purchase items" ON public.purchase_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete purchase items" ON public.purchase_items FOR DELETE TO authenticated USING (true);

CREATE TABLE public.sale_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE, invoice_no TEXT, subtotal NUMERIC(12,2) DEFAULT 0, discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0, payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'due', 'partial')),
  notes TEXT, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sales" ON public.sale_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales" ON public.sale_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sales" ON public.sale_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sales" ON public.sale_transactions FOR DELETE TO authenticated USING (true);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sale_id UUID REFERENCES public.sale_transactions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, product_name TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0, subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sale items" ON public.sale_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sale items" ON public.sale_items FOR DELETE TO authenticated USING (true);

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1001;
CREATE OR REPLACE FUNCTION public.generate_invoice_number() RETURNS TRIGGER AS $$
DECLARE fiscal_year TEXT; next_num INTEGER;
BEGIN fiscal_year := TO_CHAR(NOW(), 'YY'); next_num := nextval('public.invoice_number_seq');
NEW.invoice_no := 'QE-' || fiscal_year || '-' || LPAD(next_num::TEXT, 5, '0'); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER set_invoice_number BEFORE INSERT ON public.sale_transactions FOR EACH ROW WHEN (NEW.invoice_no IS NULL) EXECUTE FUNCTION public.generate_invoice_number();

CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE, description TEXT NOT NULL, debit NUMERIC(12,2) DEFAULT 0,
  credit NUMERIC(12,2) DEFAULT 0, balance NUMERIC(12,2) DEFAULT 0, reference_type TEXT, reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert ledger" ON public.ledger_entries FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ledger" ON public.ledger_entries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ledger" ON public.ledger_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id),
  user_email TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, description TEXT, details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL UNIQUE,
  total_sales NUMERIC DEFAULT 0, total_purchases NUMERIC DEFAULT 0, total_expenses NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0, sales_count INTEGER DEFAULT 0, purchases_count INTEGER DEFAULT 0, expenses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view summaries" ON public.daily_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert summaries" ON public.daily_summaries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update summaries" ON public.daily_summaries FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL, refresh_token TEXT NOT NULL, expiry_date BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tokens" ON public.google_drive_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tokens" ON public.google_drive_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tokens" ON public.google_drive_tokens FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tokens" ON public.google_drive_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL, file_id TEXT, status TEXT NOT NULL DEFAULT 'pending', type TEXT NOT NULL DEFAULT 'manual',
  error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view backup history" ON public.backup_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert backup history" ON public.backup_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view price lists" ON public.price_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage price lists" ON public.price_lists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), price_list_id UUID REFERENCES public.price_lists(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL, custom_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view price list items" ON public.price_list_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage price list items" ON public.price_list_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sale_id UUID REFERENCES public.sale_transactions(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL, payment_method TEXT DEFAULT 'cash', date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view receivable payments" ON public.receivable_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert receivable payments" ON public.receivable_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete receivable payments" ON public.receivable_payments FOR DELETE TO authenticated USING (true);

CREATE TABLE public.cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  opening_balance NUMERIC NOT NULL DEFAULT 0, cash_in NUMERIC NOT NULL DEFAULT 0, cash_out NUMERIC NOT NULL DEFAULT 0,
  expected_balance NUMERIC NOT NULL DEFAULT 0, actual_balance NUMERIC, discrepancy NUMERIC DEFAULT 0,
  notes TEXT, status TEXT NOT NULL DEFAULT 'open', opened_by UUID REFERENCES auth.users(id), closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view cash register" ON public.cash_register FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert cash register" ON public.cash_register FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update cash register" ON public.cash_register FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT DEFAULT 'normal', created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own todos" ON public.todos FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can insert own todos" ON public.todos FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own todos" ON public.todos FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete own todos" ON public.todos FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), identifier TEXT NOT NULL, attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_identifier_time ON public.login_attempts (identifier, attempted_at DESC);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '1 hour'; RETURN NEW; END; $$;
CREATE TRIGGER trg_cleanup_login_attempts AFTER INSERT ON public.login_attempts FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_old_login_attempts();