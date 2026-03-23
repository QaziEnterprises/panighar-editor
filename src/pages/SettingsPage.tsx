import { useState, useEffect } from "react";
import { Settings, Save, Store, Palette, Bell, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface AppSettings {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  currency: string;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  defaultPaymentMethod: string;
  invoicePrefix: string;
  theme: string;
  language: string;
}

const defaultSettings: AppSettings = {
  businessName: "Qazi Enterprises",
  businessPhone: "",
  businessAddress: "",
  currency: "PKR",
  lowStockAlert: true,
  lowStockThreshold: 10,
  defaultPaymentMethod: "cash",
  invoicePrefix: "INV-",
  theme: "system",
  language: "en",
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground">Configure your application preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saved} className="gap-2">
          <Save className="h-4 w-4" /> {saved ? "Saved" : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" /> Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Business Name</Label>
              <Input value={settings.businessName} onChange={(e) => updateSetting("businessName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Phone Number</Label>
              <Input value={settings.businessPhone} onChange={(e) => updateSetting("businessPhone", e.target.value)} placeholder="+92 300 1234567" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={settings.businessAddress} onChange={(e) => updateSetting("businessAddress", e.target.value)} placeholder="Shop address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={settings.currency} onValueChange={(v) => updateSetting("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKR">PKR (₨)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
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

        {/* Appearance */}
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

        {/* Notifications & Alerts */}
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

        {/* POS Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> POS & Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
