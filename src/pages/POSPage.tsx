import { useState, useEffect, useRef } from "react";
import { Search, X, ShoppingBag, Plus, Minus, Trash2, CreditCard, Printer, MessageCircle, ScanLine, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logAction } from "@/lib/auditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { retryQuery } from "@/lib/retryFetch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { NumberInput } from "@/components/NumberInput";
import BarcodeScanner from "@/components/BarcodeScanner";
import CustomerAutocomplete from "@/components/CustomerAutocomplete";

interface Product { id: string; name: string; selling_price: number; quantity: number; sku: string | null; }
interface Customer { id: string; name: string; phone: string | null; }
interface CartItem { product_id: string | null; name: string; quantity: number; unit_price: number; subtotal: number; max_stock: number; is_custom?: boolean; }

interface SplitPayment {
  method: string;
  amount: number;
}

interface SaleInvoice {
  invoice_no: string;
  date: string;
  customer_name: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  split_payments?: SplitPayment[];
}

export default function POSPage() {
  const { role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<SaleInvoice | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Custom product entry
  const [customProductName, setCustomProductName] = useState("");
  const [customProductQty, setCustomProductQty] = useState(1);
  const [customProductPrice, setCustomProductPrice] = useState(0);
  const [showCustomEntry, setShowCustomEntry] = useState(false);

  // New customer inline
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // Split payment for partial
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { method: "cash", amount: 0 },
    { method: "bank", amount: 0 },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: prods }, { data: custs }] = await Promise.all([
          retryQuery(() => supabase.from("products").select("id, name, selling_price, quantity, sku").order("name")),
          retryQuery(() => supabase.from("contacts").select("id, name, phone").eq("type", "customer").order("name")),
        ]);
        setProducts(prods || []);
        setCustomers(custs || []);
      } catch (e) {
        console.error("POS fetch error:", e);
        toast.error("Failed to load POS data");
      }
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = cart.find((c) => c.product_id === product.id && !c.is_custom);
    if (existing) {
      if (existing.quantity >= product.quantity) { toast.error("Not enough stock"); return; }
      setCart(cart.map((c) => c.product_id === product.id && !c.is_custom ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unit_price } : c));
    } else {
      if (product.quantity <= 0) { toast.error("Out of stock"); return; }
      setCart([...cart, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.selling_price, subtotal: product.selling_price, max_stock: product.quantity }]);
    }
  };

  const addCustomProduct = () => {
    if (!customProductName.trim()) { toast.error("Enter product name"); return; }
    if (customProductPrice <= 0) { toast.error("Enter a valid price"); return; }
    setCart([...cart, {
      product_id: null,
      name: customProductName.trim(),
      quantity: customProductQty,
      unit_price: customProductPrice,
      subtotal: customProductQty * customProductPrice,
      max_stock: 9999,
      is_custom: true,
    }]);
    setCustomProductName("");
    setCustomProductQty(1);
    setCustomProductPrice(0);
    setShowCustomEntry(false);
    toast.success("Custom item added to cart");
  };

  const addNewCustomer = async () => {
    if (!newCustomerName.trim()) { toast.error("Enter customer name"); return; }
    const { data, error } = await supabase.from("contacts").insert({
      name: newCustomerName.trim(),
      type: "customer",
      phone: newCustomerPhone || null,
      opening_balance: 0,
      current_balance: 0,
    }).select("id, name, phone").single();
    if (error) { toast.error("Failed to add customer"); return; }
    setCustomers([...customers, data]);
    setCustomerId(data.id);
    setCustomerNameInput(data.name);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setShowNewCustomer(false);
    toast.success(`Customer "${data.name}" added`);
    logAction("create", "contact", data.id, `Added customer ${data.name} from POS`);
  };

  const updateQty = (index: number, delta: number) => {
    setCart(cart.map((c, i) => {
      if (i !== index) return c;
      const newQty = Math.max(1, Math.min(c.max_stock, c.quantity + delta));
      return { ...c, quantity: newQty, subtotal: newQty * c.unit_price };
    }));
  };

  const updateUnitPrice = (index: number, price: number) => {
    setCart(cart.map((c, i) => {
      if (i !== index) return c;
      return { ...c, unit_price: price, subtotal: c.quantity * price };
    }));
  };

  const updateItemQty = (index: number, qty: number) => {
    setCart(cart.map((c, i) => {
      if (i !== index) return c;
      const newQty = Math.max(1, Math.min(c.max_stock, qty));
      return { ...c, quantity: newQty, subtotal: newQty * c.unit_price };
    }));
  };

  const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const total = subtotal - discount;

  const addSplitRow = () => {
    setSplitPayments([...splitPayments, { method: "cash", amount: 0 }]);
  };

  const removeSplitRow = (index: number) => {
    if (splitPayments.length <= 2) return;
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const updateSplitPayment = (index: number, field: "method" | "amount", value: string | number) => {
    setSplitPayments(splitPayments.map((sp, i) => i === index ? { ...sp, [field]: value } : sp));
  };

  const splitTotal = splitPayments.reduce((s, sp) => s + sp.amount, 0);
  const splitRemaining = total - splitTotal;

  const resolveCustomerName = (): string => {
    if (customerId) {
      return customers.find(c => c.id === customerId)?.name || "Walk-in Customer";
    }
    if (customerNameInput.trim()) return customerNameInput.trim();
    return "Walk-in Customer";
  };

  const resolvePaymentMethod = (): string => {
    if (paymentStatus === "partial") {
      return splitPayments.filter(sp => sp.amount > 0).map(sp => `${sp.method}:${sp.amount}`).join(", ");
    }
    return paymentMethod;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }

    // If partial, validate split payments and auto-determine status
    let finalPaymentStatus = paymentStatus;
    if (paymentStatus === "partial") {
      const paidSplit = splitPayments.reduce((s, sp) => s + sp.amount, 0);
      if (paidSplit <= 0) { toast.error("Enter at least one split payment amount"); return; }
      if (paidSplit > total) { toast.error("Split payments exceed total amount"); return; }
      // Auto-determine: if fully paid via splits, mark as "paid"; otherwise "due"
      if (paidSplit >= total) {
        finalPaymentStatus = "paid";
      } else {
        finalPaymentStatus = "due";
      }
    }

    // If customer name typed but no customer selected, auto-create
    let finalCustomerId = customerId || null;
    if (!finalCustomerId && customerNameInput.trim()) {
      const existing = customers.find(c => c.name.toLowerCase() === customerNameInput.trim().toLowerCase());
      if (existing) {
        finalCustomerId = existing.id;
      } else {
        const { data, error } = await supabase.from("contacts").insert({
          name: customerNameInput.trim(),
          type: "customer",
          opening_balance: 0,
          current_balance: 0,
        }).select("id, name, phone").single();
        if (!error && data) {
          finalCustomerId = data.id;
          setCustomers(prev => [...prev, data]);
          toast.info(`Customer "${data.name}" auto-created`);
        }
      }
    }

    setProcessing(true);

    const payMethodStr = resolvePaymentMethod();
    const splitInfo = paymentStatus === "partial" ? splitPayments.filter(sp => sp.amount > 0) : undefined;

    const notesWithSplit = paymentStatus === "partial" && splitInfo
      ? `${notes ? notes + " | " : ""}Split: ${splitInfo.map(sp => `${sp.method}: Rs ${sp.amount.toLocaleString()}`).join(", ")}${splitRemaining > 0 ? ` | Due: Rs ${splitRemaining.toLocaleString()}` : ""}`
      : notes || null;

    const { data: sale, error } = await supabase.from("sale_transactions").insert({
      customer_id: finalCustomerId,
      subtotal,
      discount,
      total,
      payment_method: payMethodStr,
      payment_status: finalPaymentStatus,
      notes: notesWithSplit,
    }).select().single();

    if (error || !sale) { toast.error("Failed to process sale"); setProcessing(false); return; }

    const items = cart.map((c) => ({ sale_id: sale.id, product_id: c.product_id || null, product_name: c.name, quantity: c.quantity, unit_price: c.unit_price, subtotal: c.subtotal }));
    await supabase.from("sale_items").insert(items);

    for (const item of cart) {
      if (item.product_id && !item.is_custom) {
        const prod = products.find((p) => p.id === item.product_id);
        if (prod) await supabase.from("products").update({ quantity: prod.quantity - item.quantity }).eq("id", item.product_id);
      }
    }

    const customerName = resolveCustomerName();
    setInvoiceData({
      invoice_no: sale.invoice_no || "N/A",
      date: sale.date,
      customer_name: customerName,
      items: [...cart],
      subtotal,
      discount,
      total,
      payment_method: payMethodStr,
      payment_status: finalPaymentStatus,
      split_payments: splitInfo,
    });
    setInvoiceDialogOpen(true);

    toast.success(`Sale completed! Invoice: ${sale.invoice_no}`);
    logAction("create", "sale", sale.id, `Sale ${sale.invoice_no} - Rs ${total} (${payMethodStr})`);
    setCart([]);
    setDiscount(0);
    setNotes("");
    setCustomerId("");
    setCustomerNameInput("");
    setPaymentStatus("paid");
    setSplitPayments([{ method: "cash", amount: 0 }, { method: "bank", amount: 0 }]);
    setProcessing(false);

    const { data: prods } = await supabase.from("products").select("id, name, selling_price, quantity, sku").order("name");
    setProducts(prods || []);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Please allow popups to print"); return; }
    printWindow.document.write(`
      <html><head><title>Invoice - ${invoiceData?.invoice_no}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; font-size: 12px; color: #222; }
        .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 12px; }
        .header h1 { font-size: 20px; margin-bottom: 2px; }
        .header p { font-size: 11px; color: #555; }
        .info { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .text-right { text-align: right; }
        .totals { margin-left: auto; width: 250px; }
        .totals td { border: none; padding: 3px 8px; }
        .totals .grand-total td { font-size: 16px; font-weight: 700; border-top: 2px solid #000; padding-top: 8px; }
        .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #888; border-top: 1px dashed #ccc; padding-top: 8px; }
        .split-info { margin-top: 8px; font-size: 11px; }
        .split-info p { margin: 2px 0; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      <script>window.onload = function() { window.print(); window.close(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    if (!invoiceData) return;
    const items = invoiceData.items.map((item, i) => `${i + 1}. ${item.name} x${item.quantity} = Rs ${item.subtotal.toLocaleString()}`).join("\n");
    let paymentInfo = `Payment: ${invoiceData.payment_method.toUpperCase()} (${invoiceData.payment_status})`;
    if (invoiceData.split_payments && invoiceData.split_payments.length > 0) {
      paymentInfo = `*Payment Split:*\n${invoiceData.split_payments.map(sp => `• ${sp.method}: Rs ${sp.amount.toLocaleString()}`).join("\n")}`;
      const remaining = invoiceData.total - invoiceData.split_payments.reduce((s, sp) => s + sp.amount, 0);
      if (remaining > 0) paymentInfo += `\n• Due: Rs ${remaining.toLocaleString()}`;
    }
    const msg = `*Qazi Enterprises - Invoice*\n\nInvoice: ${invoiceData.invoice_no}\nDate: ${invoiceData.date}\nCustomer: ${invoiceData.customer_name}\n\n*Items:*\n${items}\n\nSubtotal: Rs ${invoiceData.subtotal.toLocaleString()}${invoiceData.discount > 0 ? `\nDiscount: -Rs ${invoiceData.discount.toLocaleString()}` : ""}\n*Total: Rs ${invoiceData.total.toLocaleString()}*\n${paymentInfo}\n\nThank you for your business!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleBarcodeScan = (code: string) => {
    const product = products.find((p) => p.sku?.toLowerCase() === code.toLowerCase() || p.name.toLowerCase().includes(code.toLowerCase()));
    if (product) {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } else {
      setSearch(code);
      toast.error(`No product found for "${code}". Showing search results.`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
      {/* Product List */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCustomEntry(!showCustomEntry)}>
                <Plus className="h-4 w-4" /> Custom Item
              </Button>
              <Button variant="outline" className="gap-2" size="sm" onClick={() => setScannerOpen(true)}>
                <ScanLine className="h-4 w-4" /> Scan
              </Button>
              <Button variant="outline" className="lg:hidden gap-2" size="sm" onClick={() => setShowCart(!showCart)}>
                <ShoppingBag className="h-4 w-4" /> Cart ({cart.length})
              </Button>
            </div>
          </div>

          {showCustomEntry && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 rounded-lg border bg-muted/30 p-3">
              <h3 className="text-sm font-semibold mb-2">Add Custom Item (not in inventory)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input placeholder="Product name *" value={customProductName} onChange={(e) => setCustomProductName(e.target.value)} className="text-sm" />
                <NumberInput value={customProductQty} onValueChange={setCustomProductQty} min={1} className="text-sm" />
                <NumberInput value={customProductPrice} onValueChange={setCustomProductPrice} className="text-sm" />
                <div className="flex gap-1">
                  <Button size="sm" onClick={addCustomProduct} className="flex-1">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCustomEntry(false)}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start ${showCart ? "hidden lg:grid" : ""}`}>
          {filteredProducts.map((p) => (
            <motion.button
              key={p.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => addToCart(p)}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${p.quantity <= 0 ? "opacity-50" : ""}`}
            >
              <div className="font-medium text-sm truncate">{p.name}</div>
              {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold">Rs {Number(p.selling_price).toLocaleString()}</span>
                <Badge variant={p.quantity <= 0 ? "destructive" : "secondary"} className="text-xs">{p.quantity} left</Badge>
              </div>
            </motion.button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {search ? "No products match your search." : "No products available. Add products first."}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <Card className={`w-full lg:w-[420px] flex flex-col shrink-0 ${showCart ? "" : "hidden lg:flex"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Cart ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-2 mb-3">
            <AnimatePresence>
              {cart.map((item, index) => (
                <motion.div key={`${item.product_id || item.name}-${index}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-lg border p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.is_custom && <Badge variant="outline" className="text-[10px] h-4">Custom</Badge>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeFromCart(index)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(index, -1)}><Minus className="h-3 w-3" /></Button>
                      <NumberInput value={item.quantity} onValueChange={(v) => updateItemQty(index, v)} className="w-12 h-6 text-xs text-center" min={1} />
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(index, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <span className="text-xs text-muted-foreground">×</span>
                    <NumberInput value={item.unit_price} onValueChange={(v) => updateUnitPrice(index, v)} className="w-20 h-6 text-xs text-right" min={0} />
                    <span className="text-sm font-bold ml-auto">Rs {item.subtotal.toLocaleString()}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {cart.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Add products to cart</p>}
          </div>

          <Separator className="mb-3" />

          <div className="space-y-3">
            {/* Customer: Autocomplete with combined name + phone search */}
            <div>
              <Label className="text-xs mb-1 block">Customer</Label>
              <CustomerAutocomplete
                customers={customers}
                value={customerNameInput}
                onValueChange={(v) => {
                  setCustomerNameInput(v);
                  setCustomerId("");
                }}
                onCustomerSelect={(c) => {
                  if (c) {
                    setCustomerId(c.id);
                    setCustomerNameInput(c.name);
                  }
                }}
                placeholder="Type customer name or phone..."
              />
              <div className="flex gap-1 mt-1">
                {customerId && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    ✓ {customers.find(c => c.id === customerId)?.name}
                  </Badge>
                )}
                <Button size="icon" variant="outline" className="h-7 w-7 shrink-0 ml-auto" onClick={() => setShowNewCustomer(!showNewCustomer)} title="Add new customer">
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {showNewCustomer && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded border p-2 space-y-2 bg-muted/30">
                <p className="text-xs font-semibold">Quick Add Customer</p>
                <Input placeholder="Customer name *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="h-7 text-xs" />
                <Input placeholder="Phone (optional)" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="h-7 text-xs" />
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={addNewCustomer}>Save Customer</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                </div>
              </motion.div>
            )}

            {/* Payment Method & Status */}
            <div className="flex gap-2">
              {paymentStatus !== "partial" && (
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="due">Due (Udhar)</SelectItem>
                  <SelectItem value="partial">Partial / Split</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Split Payment Section */}
            {paymentStatus === "partial" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-lg border bg-muted/20 p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Split Payment Details</p>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={addSplitRow}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {splitPayments.map((sp, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Select value={sp.method} onValueChange={(v) => updateSplitPayment(i, "method", v)}>
                      <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                        <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                      </SelectContent>
                    </Select>
                    <NumberInput
                      value={sp.amount}
                      onValueChange={(v) => updateSplitPayment(i, "amount", v)}
                      className="h-7 text-xs flex-1"
                      min={0}
                    />
                    {splitPayments.length > 2 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeSplitRow(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid so far:</span>
                    <span className="font-medium">Rs {splitTotal.toLocaleString()}</span>
                  </div>
                  {splitTotal >= total && total > 0 ? (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>✓ Fully paid</span>
                      <span>Will be marked as PAID</span>
                    </div>
                  ) : splitRemaining > 0 ? (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>Remaining (Due):</span>
                      <span>Rs {splitRemaining.toLocaleString()} — will be DUE</span>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">Discount:</Label>
              <NumberInput value={discount} onValueChange={setDiscount} className="h-8 text-xs" />
            </div>

            <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-xs" />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>
              {discount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-Rs {discount.toLocaleString()}</span></div>}
              <Separator />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>Rs {total.toLocaleString()}</span></div>
            </div>

            <Button className="w-full gap-2" size="lg" onClick={handleCheckout} disabled={cart.length === 0 || processing}>
              <CreditCard className="h-4 w-4" /> {processing ? "Processing..." : "Complete Sale"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Print Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Invoice Preview
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={handleWhatsApp}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={handlePrint}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {invoiceData && (
            <div ref={printRef}>
              <div className="header">
                <h1>Qazi Enterprises</h1>
                <p>Your trusted business partner</p>
              </div>
              <div className="info" style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 12 }}>
                <div>
                  <p><strong>Invoice:</strong> {invoiceData.invoice_no}</p>
                  <p><strong>Customer:</strong> {invoiceData.customer_name}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p><strong>Date:</strong> {invoiceData.date}</p>
                  <p><strong>Status:</strong> {invoiceData.payment_status.toUpperCase()}</p>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #000" }}>
                    <th style={{ textAlign: "left", padding: "6px 4px" }}>#</th>
                    <th style={{ textAlign: "left", padding: "6px 4px" }}>Product</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Qty</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Price</th>
                    <th style={{ textAlign: "right", padding: "6px 4px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "6px 4px" }}>{i + 1}</td>
                      <td style={{ padding: "6px 4px" }}>{item.name}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px" }}>Rs {item.unit_price.toLocaleString()}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px" }}>Rs {item.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginLeft: "auto", width: 220, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>Subtotal:</span><span>Rs {invoiceData.subtotal.toLocaleString()}</span>
                </div>
                {invoiceData.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "red" }}>
                    <span>Discount:</span><span>-Rs {invoiceData.discount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", borderTop: "2px solid #000", fontWeight: 700, fontSize: 16 }}>
                  <span>Total:</span><span>Rs {invoiceData.total.toLocaleString()}</span>
                </div>
              </div>
              {/* Split Payment Info on Invoice */}
              {invoiceData.split_payments && invoiceData.split_payments.length > 0 && (
                <div className="split-info" style={{ marginTop: 12, padding: "8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 11 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Payment Breakdown:</p>
                  {invoiceData.split_payments.map((sp, i) => (
                    <p key={i}>• {sp.method.charAt(0).toUpperCase() + sp.method.slice(1)}: Rs {sp.amount.toLocaleString()}</p>
                  ))}
                  {(() => {
                    const remaining = invoiceData.total - invoiceData.split_payments!.reduce((s, sp) => s + sp.amount, 0);
                    return remaining > 0 ? <p style={{ color: "red", fontWeight: 600 }}>• Due: Rs {remaining.toLocaleString()}</p> : null;
                  })()}
                </div>
              )}
              <div className="footer" style={{ textAlign: "center", marginTop: 24, fontSize: 10, color: "#888", borderTop: "1px dashed #ccc", paddingTop: 8 }}>
                <p>Thank you for your business!</p>
                <p>Qazi Enterprises — All rights reserved</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />
    </div>
  );
}
