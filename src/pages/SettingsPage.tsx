import { useState, useEffect } from "react";
import { Settings, Save, Store, Palette, Bell, Shield, Receipt, FileText, Percent, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AppSettings {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  businessEmail: string;
  businessTagline: string;
  currency: string;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  defaultPaymentMethod: string;
  invoicePrefix: string;
  theme: string;
  language: string;
  taxEnabled: boolean;
  taxRate: number;
  taxLabel: string;
  receiptShowLogo: boolean;
  receiptFooterText: string;
  receiptShowTax: boolean;
  autoCreateCustomer: boolean;
  defaultPaymentStatus: string;
  enableBarcode: boolean;
  enableWhatsApp: boolean;
  whatsAppDefault: string;
  dateFormat: string;
  numberFormat: string;
  posGridColumns: string;
  soundOnSale: boolean;
}

const defaultSettings: AppSettings = {
  businessName: "Qazi Enterprises",
  businessPhone: "",
  businessAddress: "",
  businessEmail: "",
  businessTagline: "Your trusted business partner",
  currency: "PKR",
  lowStockAlert: true,
  lowStockThreshold: 10,
  defaultPaymentMethod: "cash",
  invoicePrefix: "QE-",
  theme: "system",
  language: "en",
  taxEnabled: false,
  taxRate: 0,
  taxLabel: "GST",
  receiptShowLogo: true,
  receiptFooterText: "Thank you for your business!",
  receiptShowTax: false,
  autoCreateCustomer: true,
  defaultPaymentStatus: "paid",
  enableBarcode: true,
  enableWhatsApp: true,
  whatsAppDefault: "",
  dateFormat: "dd/MM/yyyy",
  numberFormat: "en-PK",
  posGridColumns: "4",
  soundOnSale: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("app_settings");
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch { /* use defaults */ }
    }
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("app_settings", JSON.stringify(settings));
    setSaved(true);
    toast.success("Settings saved successfully");
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setSaved(false);
    toast.info("Settings reset to defaults — click Save to apply");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground">Configure your application preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>Reset Defaults</Button>
          <Button onClick={handleSave} disabled={saved} className="gap-2">
            <Save className="h-4 w-4" /> {saved ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="gap-1.5 text-xs"><Store className="h-3.5 w-3.5" /> Business</TabsTrigger>
          <TabsTrigger value="pos" className="gap-1.5 text-xs"><Receipt className="h-3.5 w-3.5" /> POS & Billing</TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5 text-xs"><Percent className="h-3.5 w-3.5" /> Tax</TabsTrigger>
          <TabsTrigger value="receipt" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Receipt</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" /> Alerts</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
        </TabsList>

        {/* Business Information */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" /> Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Business Name</Label>
                  <Input value={settings.businessName} onChange={(e) => updateSetting("businessName", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Tagline</Label>
                  <Input value={settings.businessTagline} onChange={(e) => updateSetting("businessTagline", e.target.value)} placeholder="Your trusted business partner" />
                </div>
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <Input value={settings.businessPhone} onChange={(e) => updateSetting("businessPhone", e.target.value)} placeholder="+92 300 1234567" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={settings.businessEmail} onChange={(e) => updateSetting("businessEmail", e.target.value)} placeholder="info@business.com" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={settings.businessAddress} onChange={(e) => updateSetting("businessAddress", e.target.value)} placeholder="Shop address" />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={settings.currency} onValueChange={(v) => updateSetting("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR (₨)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                      <SelectItem value="SAR">SAR (﷼)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date Format</Label>
                  <Select value={settings.dateFormat} onValueChange={(v) => updateSetting("dateFormat", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Invoice Prefix</Label>
                  <Input value={settings.invoicePrefix} onChange={(e) => updateSetting("invoicePrefix", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POS & Billing */}
        <TabsContent value="pos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> POS & Payment Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Default Payment Method</Label>
                  <Select value={settings.defaultPaymentMethod} onValueChange={(v) => updateSetting("defaultPaymentMethod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="jazzcash">JazzCash</SelectItem>
                      <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Default Payment Status</Label>
                  <Select value={settings.defaultPaymentStatus} onValueChange={(v) => updateSetting("defaultPaymentStatus", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="due">Due (Udhar)</SelectItem>
                      <SelectItem value="partial">Partial / Split</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>POS Grid Columns</Label>
                  <Select value={settings.posGridColumns} onValueChange={(v) => updateSetting("posGridColumns", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Columns</SelectItem>
                      <SelectItem value="3">3 Columns</SelectItem>
                      <SelectItem value="4">4 Columns</SelectItem>
                      <SelectItem value="5">5 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Create Customer</Label>
                    <p className="text-xs text-muted-foreground">Automatically create customer when typing a new name in POS</p>
                  </div>
                  <Switch checked={settings.autoCreateCustomer} onCheckedChange={(v) => updateSetting("autoCreateCustomer", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Barcode Scanner</Label>
                    <p className="text-xs text-muted-foreground">Show barcode scan button on POS</p>
                  </div>
                  <Switch checked={settings.enableBarcode} onCheckedChange={(v) => updateSetting("enableBarcode", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sound on Sale</Label>
                    <p className="text-xs text-muted-foreground">Play a sound when a sale is completed</p>
                  </div>
                  <Switch checked={settings.soundOnSale} onCheckedChange={(v) => updateSetting("soundOnSale", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" /> Tax Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Tax</Label>
                  <p className="text-xs text-muted-foreground">Apply tax on sales transactions</p>
                </div>
                <Switch checked={settings.taxEnabled} onCheckedChange={(v) => updateSetting("taxEnabled", v)} />
              </div>
              {settings.taxEnabled && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Tax Label</Label>
                      <Input value={settings.taxLabel} onChange={(e) => updateSetting("taxLabel", e.target.value)} placeholder="e.g. GST, VAT, Sales Tax" />
                    </div>
                    <div className="space-y-1">
                      <Label>Tax Rate (%)</Label>
                      <Input type="number" value={settings.taxRate} onChange={(e) => updateSetting("taxRate", Number(e.target.value))} min={0} max={100} step={0.5} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipt */}
        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Receipt & Invoice Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Logo on Receipt</Label>
                  <p className="text-xs text-muted-foreground">Display business logo at the top of receipts</p>
                </div>
                <Switch checked={settings.receiptShowLogo} onCheckedChange={(v) => updateSetting("receiptShowLogo", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Tax on Receipt</Label>
                  <p className="text-xs text-muted-foreground">Display tax breakdown on printed receipts</p>
                </div>
                <Switch checked={settings.receiptShowTax} onCheckedChange={(v) => updateSetting("receiptShowTax", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable WhatsApp Sharing</Label>
                  <p className="text-xs text-muted-foreground">Show WhatsApp share button on invoices</p>
                </div>
                <Switch checked={settings.enableWhatsApp} onCheckedChange={(v) => updateSetting("enableWhatsApp", v)} />
              </div>
              <Separator />
              <div className="space-y-1">
                <Label>Receipt Footer Text</Label>
                <Input value={settings.receiptFooterText} onChange={(e) => updateSetting("receiptFooterText", e.target.value)} placeholder="Thank you for your business!" />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp Default Number</Label>
                <Input value={settings.whatsAppDefault} onChange={(e) => updateSetting("whatsAppDefault", e.target.value)} placeholder="+923001234567 (optional)" />
                <p className="text-xs text-muted-foreground">Pre-fill WhatsApp number for invoice sharing</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notifications & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Stock Alerts</Label>
                  <p className="text-xs text-muted-foreground">Get notified when products are running low</p>
                </div>
                <Switch checked={settings.lowStockAlert} onCheckedChange={(v) => updateSetting("lowStockAlert", v)} />
              </div>
              <Separator />
              <div className="space-y-1">
                <Label>Default Low Stock Threshold</Label>
                <Input type="number" value={settings.lowStockThreshold} onChange={(e) => updateSetting("lowStockThreshold", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Products below this quantity will trigger alerts</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" /> Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Theme</Label>
                <Select value={settings.theme} onValueChange={(v) => updateSetting("theme", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Language</Label>
                <Select value={settings.language} onValueChange={(v) => updateSetting("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ur">Urdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
