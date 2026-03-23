import { useState, useEffect } from "react";
import { Banknote, CreditCard, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { retryQuery } from "@/lib/retryFetch";

interface DailySummaryData {
  totalSales: number;
  salesCount: number;
  cashSales: number;
  bankSales: number;
  jazzCashSales: number;
  easyPaisaSales: number;
  creditSales: number;
  paidSales: number;
  partialSales: number;
  dueSales: number;
}

export default function DailySalesSummary() {
  const [summary, setSummary] = useState<DailySummaryData>({
    totalSales: 0, salesCount: 0, cashSales: 0, bankSales: 0,
    jazzCashSales: 0, easyPaisaSales: 0, creditSales: 0,
    paidSales: 0, partialSales: 0, dueSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: sales } = await retryQuery(() =>
        supabase.from("sale_transactions").select("total, payment_method, payment_status").eq("date", todayStr)
      );

      const allSales = sales || [];
      const totalSales = allSales.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      
      // Calculate by payment method
      const cashSales = allSales.filter((r: any) => r.payment_method === "cash" && r.payment_status === "paid")
        .reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      const bankSales = allSales.filter((r: any) => r.payment_method === "bank" && r.payment_status === "paid")
        .reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      const jazzCashSales = allSales.filter((r: any) => r.payment_method === "jazzcash" && r.payment_status === "paid")
        .reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      const easyPaisaSales = allSales.filter((r: any) => r.payment_method === "easypaisa" && r.payment_status === "paid")
        .reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      
      // Calculate by payment status
      const paidSales = allSales.filter((r: any) => r.payment_status === "paid")
        .reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      const dueSales = allSales.filter((r: any) => r.payment_status === "due")
        .reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      const partialSales = allSales.filter((r: any) => r.payment_status === "partial")
        .reduce((s: number, r: any) => s + Number(r.total || 0), 0);

      // Credit = due + partial
      const creditSales = dueSales + partialSales;

      setSummary({
        totalSales, salesCount: allSales.length,
        cashSales, bankSales, jazzCashSales, easyPaisaSales,
        creditSales, paidSales, partialSales, dueSales,
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Daily summary fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Daily Sales Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={fetchSummary} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total */}
        <div className="text-center p-3 rounded-lg bg-primary/5 border">
          <p className="text-xs text-muted-foreground mb-1">Today's Total Sales</p>
          <p className="text-3xl font-bold text-primary">Rs {summary.totalSales.toLocaleString()}</p>
          <Badge variant="secondary" className="mt-1 text-[10px]">{summary.salesCount} transactions</Badge>
        </div>

        {/* Payment Method Breakdown */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">By Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 rounded-lg border bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <span className="text-xs">Cash</span>
              </div>
              <span className="text-sm font-bold text-green-600">Rs {summary.cashSales.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-xs">Bank</span>
              </div>
              <span className="text-sm font-bold text-blue-600">Rs {summary.bankSales.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-600 w-4 text-center">JC</span>
                <span className="text-xs">JazzCash</span>
              </div>
              <span className="text-sm font-bold text-red-600">Rs {summary.jazzCashSales.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 w-4 text-center">EP</span>
                <span className="text-xs">EasyPaisa</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">Rs {summary.easyPaisaSales.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Status Breakdown */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">By Payment Status</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Paid (Collected)</span>
              </div>
              <span className="text-sm font-bold text-green-600">Rs {summary.paidSales.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm">Credit / Due (Udhar)</span>
              </div>
              <span className="text-sm font-bold text-amber-600">Rs {summary.creditSales.toLocaleString()}</span>
            </div>
            {summary.dueSales > 0 && (
              <div className="flex items-center justify-between pl-4">
                <span className="text-xs text-muted-foreground">└ Full Due</span>
                <span className="text-xs font-medium text-destructive">Rs {summary.dueSales.toLocaleString()}</span>
              </div>
            )}
            {summary.partialSales > 0 && (
              <div className="flex items-center justify-between pl-4">
                <span className="text-xs text-muted-foreground">└ Partial</span>
                <span className="text-xs font-medium text-amber-500">Rs {summary.partialSales.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* End of Day Summary */}
        <div className="rounded-lg border-2 border-dashed p-3 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" /> End of Day Closing
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cash in Hand:</span>
            <span className="font-bold">Rs {summary.cashSales.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bank Received:</span>
            <span className="font-bold">Rs {(summary.bankSales + summary.jazzCashSales + summary.easyPaisaSales).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Credit Given:</span>
            <span className="font-bold text-amber-600">Rs {summary.creditSales.toLocaleString()}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm font-bold">
            <span>Total Day Sales:</span>
            <span className="text-primary">Rs {summary.totalSales.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
