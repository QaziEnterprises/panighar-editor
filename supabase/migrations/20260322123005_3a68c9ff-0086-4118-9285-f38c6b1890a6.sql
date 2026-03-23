CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  fiscal_year TEXT;
  next_num INTEGER;
BEGIN
  fiscal_year := TO_CHAR(NOW(), 'YY');
  next_num := nextval('public.invoice_number_seq');
  NEW.invoice_no := 'QE-' || fiscal_year || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;