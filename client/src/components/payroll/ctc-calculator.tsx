import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calculator, Download, RotateCcw, Info, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export function CTCCalculator() {
  const [ctc, setCtc] = React.useState<number>(50000);
  const [isYearly, setIsYearly] = React.useState(false);
  const [taxRegime, setTaxRegime] = React.useState<"old" | "new">("new");
  
  // Percentages (Default values)
  const [percentages, setPercentages] = React.useState({
    basic: 40,
    hra: 20,
    da: 10,
    lta: 5,
    special: 15,
    performance: 10,
  });

  const [options, setOptions] = React.useState({
    epf: true,
    profTax: true,
    esi: false,
    metroCity: true,
  });

  const monthlyCTC = isYearly ? ctc / 12 : ctc;
  const annualCTC = isYearly ? ctc : ctc * 12;

  // Calculations
  const grossSalary = monthlyCTC; // For simplicity in this calculator
  const basic = (grossSalary * percentages.basic) / 100;
  const hra = (grossSalary * percentages.hra) / 100;
  const da = (grossSalary * percentages.da) / 100;
  const lta = (grossSalary * percentages.lta) / 100;
  const performance = (grossSalary * percentages.performance) / 100;
  const specialAllowance = grossSalary - (basic + hra + da + lta + performance);

  // Deductions
  const epfEmployee = options.epf ? Math.min(basic * 0.12, 1800) : 0;
  const epfEmployer = options.epf ? epfEmployee : 0;
  const profTax = options.profTax ? 200 : 0;
  
  // Simple Income Tax Calculation
  const calculateIncomeTax = (annualIncome: number, regime: "old" | "new") => {
    if (regime === "new") {
      const stdDed = 75000;
      const taxable = Math.max(0, annualIncome - stdDed);
      
      // Rebate for New Regime FY 2025-26: NIL tax if taxable income up to 12L
      if (taxable <= 1200000) return 0;
      
      // New Regime Slabs FY 2025-26
      let tax = 0;
      if (taxable > 2400000) tax += (taxable - 2400000) * 0.30;
      if (taxable > 2000000) tax += (Math.min(taxable, 2400000) - 2000000) * 0.25;
      if (taxable > 1600000) tax += (Math.min(taxable, 2000000) - 1600000) * 0.20;
      if (taxable > 1200000) tax += (Math.min(taxable, 1600000) - 1200000) * 0.15;
      if (taxable > 800000) tax += (Math.min(taxable, 1200000) - 800000) * 0.10;
      if (taxable > 400000) tax += (Math.min(taxable, 800000) - 400000) * 0.05;
      
      return tax * 1.04; // Including 4% Cess
    } else {
      const stdDed = 50000;
      // Deductions under Old Regime (simplified)
      const deductions = taxRegime === "old" ? Math.min(epfEmployee * 12 + 100000, 150000) : 0; // 80C estimate
      const taxable = Math.max(0, annualIncome - stdDed - deductions);
      
      // Rebate for Old Regime: NIL tax if taxable income up to 5L
      if (taxable <= 500000) return 0;
      
      // Old Regime Slabs
      let tax = 0;
      if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
      if (taxable > 500000) tax += (Math.min(taxable, 1000000) - 500000) * 0.20;
      if (taxable > 250000) tax += (Math.min(taxable, 500000) - 250000) * 0.05;
      
      return tax * 1.04; // Including 4% Cess
    }
  };

  const annualIncomeTax = calculateIncomeTax(annualCTC, taxRegime);
  const incomeTax = annualIncomeTax / 12;

  const totalDeductions = epfEmployee + profTax + incomeTax;
  const netMonthlySalary = monthlyCTC - totalDeductions;

  const handleReset = () => {
    setCtc(50000);
    setPercentages({
      basic: 40,
      hra: 20,
      da: 10,
      lta: 5,
      special: 15,
      performance: 10,
    });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("CTC Breakdown Report", 14, 15);
    const tableData = [
      ["Component", "Monthly Amount", "Annual Amount"],
      ["Basic Salary", `INR ${basic.toFixed(0)}`, `INR ${(basic * 12).toFixed(0)}`],
      ["HRA", `INR ${hra.toFixed(0)}`, `INR ${(hra * 12).toFixed(0)}`],
      ["DA", `INR ${da.toFixed(0)}`, `INR ${(da * 12).toFixed(0)}`],
      ["LTA", `INR ${lta.toFixed(0)}`, `INR ${(lta * 12).toFixed(0)}`],
      ["Special Allowance", `INR ${specialAllowance.toFixed(0)}`, `INR ${(specialAllowance * 12).toFixed(0)}`],
      ["Performance Bonus", `INR ${performance.toFixed(0)}`, `INR ${(performance * 12).toFixed(0)}`],
      ["Gross Salary", `INR ${grossSalary.toFixed(0)}`, `INR ${(grossSalary * 12).toFixed(0)}`],
      ["EPF (Employee)", `INR ${epfEmployee.toFixed(0)}`, `INR ${(epfEmployee * 12).toFixed(0)}`],
      ["Professional Tax", `INR ${profTax.toFixed(0)}`, `INR ${(profTax * 12).toFixed(0)}`],
      ["Income Tax", `INR ${incomeTax.toFixed(0)}`, `INR ${(incomeTax * 12).toFixed(0)}`],
      ["Net Take Home", `INR ${netMonthlySalary.toFixed(0)}`, `INR ${(netMonthlySalary * 12).toFixed(0)}`],
    ];
    (doc as any).autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: 25,
    });
    doc.save("ctc-breakdown.pdf");
  };

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-xl border-t-4 border-t-primary">
      <CardHeader className="bg-muted/30 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">CTC Calculator</CardTitle>
              <CardDescription>Calculate take-home salary and compensation structure</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="hover-elevate">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6">
        {/* Left Column: Inputs */}
        <div className="md:col-span-7 space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Cost to Company (CTC)</Label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input 
                  type="number" 
                  value={ctc} 
                  onChange={(e) => setCtc(Number(e.target.value))}
                  className="pl-8 h-12 text-lg font-medium"
                />
              </div>
              <Tabs 
                value={isYearly ? "yearly" : "monthly"} 
                onValueChange={(v) => setIsYearly(v === "yearly")}
                className="w-full sm:w-[200px]"
              >
                <TabsList className="grid grid-cols-2 h-12">
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Customize Components (%)</Label>
              <Badge variant="secondary" className="font-normal">Total: 100%</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(percentages).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize text-xs text-muted-foreground">{key} Salary</Label>
                    <span className="text-xs font-medium">{value}%</span>
                  </div>
                  <Input 
                    type="number" 
                    value={value} 
                    onChange={(e) => setPercentages(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-semibold">Settings & Deductions</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">EPF Applicable</Label>
                  <p className="text-xs text-muted-foreground">12% of Basic</p>
                </div>
                <Switch 
                  checked={options.epf} 
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, epf: v }))} 
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Professional Tax</Label>
                  <p className="text-xs text-muted-foreground">₹200 Monthly</p>
                </div>
                <Switch 
                  checked={options.profTax} 
                  onCheckedChange={(v) => setOptions(prev => ({ ...prev, profTax: v }))} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown */}
        <div className="md:col-span-5">
          <motion.div 
            layout
            className="rounded-xl border bg-primary/5 p-6 h-full flex flex-col"
          >
            <div className="mb-6">
              <Tabs value={taxRegime} onValueChange={(v: any) => setTaxRegime(v)} className="w-full">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="old">Old Regime</TabsTrigger>
                  <TabsTrigger value="new">New Regime</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-6 flex-1">
              <div className="text-center p-4 rounded-lg bg-background shadow-sm border">
                <p className="text-sm text-muted-foreground mb-1">Net Monthly Take Home</p>
                <h3 className="text-3xl font-bold text-primary">₹ {netMonthlySalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                <p className="text-xs text-muted-foreground mt-2">Annual Equivalent: ₹ {(netMonthlySalary * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Earnings
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Basic Salary</span><span className="font-medium">₹ {basic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>HRA</span><span className="font-medium">₹ {hra.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Special Allowance</span><span className="font-medium">₹ {specialAllowance.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Gross Salary</span><span>₹ {grossSalary.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Deductions
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>EPF (Employee)</span><span className="text-destructive">- ₹ {epfEmployee.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Professional Tax</span><span className="text-destructive">- ₹ {profTax.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Income Tax (Est.)</span><span className="text-destructive">- ₹ {incomeTax.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Total Deductions</span><span className="text-destructive">- ₹ {totalDeductions.toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button onClick={exportPDF} className="w-full hover-elevate">
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="outline" className="w-full hover-elevate">
                <Download className="w-4 h-4 mr-2" /> Excel
              </Button>
            </div>
          </motion.div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 border-t text-center justify-center p-4">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-3 h-3" /> Note: This is an estimated breakdown based on standard Indian payroll practices.
        </p>
      </CardFooter>
    </Card>
  );
}
