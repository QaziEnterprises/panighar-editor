CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  fiscal_year TEXT;
  next_num INTEGER;
BEGIN
  fiscal_year := TO_CHAR(NOW(), 'YY');
  next_num := nextval('invoice_number_seq');
  NEW.invoice_no := 'QE-' || fiscal_year || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number ON sale_transactions;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON sale_transactions
  FOR EACH ROW
  WHEN (NEW.invoice_no IS NULL)
  EXECUTE FUNCTION generate_invoice_number();