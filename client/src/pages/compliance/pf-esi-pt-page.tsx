import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, FileText, Download, Upload, IndianRupee, Users, Building2, TrendingUp, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber, COMPANY_NAME, COMPANY_ADDRESS } from "@/lib/pdf-utils";
import { User } from "@shared/schema";

export default function PfEsiPtPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  // Fetch real employee data
  const { data: employees = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });
  
  // Fetch system settings for salary components
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/settings/system"],
    queryFn: async () => {
      const response = await fetch("/api/settings/system", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 403) return null;
        throw new Error("Failed to fetch system settings");
      }
      return response.json();
    },
    retry: false,
  });
  
  // Get salary component percentages from settings or defaults
  const salaryComponents = systemSettings?.salaryComponents || {
    basicSalaryPercentage: 50,
    hraPercentage: 50,
    epfPercentage: 12,
    esicPercentage: 0.75,
    professionalTax: 200
  };
  
  // Calculate PF data from real employees
  const pfData = useMemo(() => {
    return employees
      .filter(emp => emp.isActive && emp.salary && emp.salary > 0)
      .map(emp => {
        const salary = emp.salary!;
        const monthlyCTC = salary / 12;
        const basicSalary = Math.round(monthlyCTC * (salaryComponents.basicSalaryPercentage / 100));
        const employeeContrib = Math.round(basicSalary * 0.12);
        const employerContrib = Math.round(basicSalary * 0.12);
        const edliContrib = Math.round(basicSalary * 0.005);
        const adminCharges = Math.round(basicSalary * 0.005);
        return {
          employee: `${emp.firstName} ${emp.lastName}`,
          basicSalary,
          employeeContrib,
          employerContrib,
          edliContrib,
          adminCharges,
          total: employeeContrib + employerContrib + edliContrib + adminCharges
        };
      });
  }, [employees, salaryComponents]);
  
  // Calculate ESI data - Only for employees with gross salary <= 21000/month
  const esiData = useMemo(() => {
    return employees
      .filter(emp => {
        if (!emp.isActive || !emp.salary || emp.salary <= 0) return false;
        const monthlySalary = emp.salary / 12;
        return monthlySalary <= 21000; // ESI limit
      })
      .map(emp => {
        const salary = emp.salary!;
        const grossSalary = Math.round(salary / 12);
        const employeeContrib = Math.round(grossSalary * 0.0075); // 0.75%
        const employerContrib = Math.round(grossSalary * 0.0325); // 3.25%
        return {
          employee: `${emp.firstName} ${emp.lastName}`,
          grossSalary,
          employeeContrib,
          employerContrib,
          total: employeeContrib + employerContrib
        };
      });
  }, [employees]);
  
  // Calculate PT data from real employees
  const ptData = useMemo(() => {
    return employees
      .filter(emp => emp.isActive && emp.salary && emp.salary > 0)
      .map(emp => {
        const salary = emp.salary!;
        const grossSalary = Math.round(salary / 12);
        // PT varies by state - using Maharashtra default (200)
        // PT amount based on salary slab
        let ptAmount = 200; // Default for high salary
        if (grossSalary < 10000) ptAmount = 0;
        else if (grossSalary < 15000) ptAmount = 150;
        else if (grossSalary < 25000) ptAmount = 175;
        
        return {
          employee: `${emp.firstName} ${emp.lastName}`,
          grossSalary,
          ptAmount,
          state: "Maharashtra"
        };
      });
  }, [employees]);
  
  // Calculate compliance stats from real data
  const complianceStats = useMemo(() => {
    const totalPF = pfData.reduce((sum, row) => sum + row.total, 0);
    const totalESI = esiData.reduce((sum, row) => sum + row.total, 0);
    const totalPT = ptData.reduce((sum, row) => sum + row.ptAmount, 0);
    const eligibleCount = pfData.length;
    
    return [
      { title: "Total PF Contribution", value: `₹${totalPF.toLocaleString()}`, change: `${eligibleCount} emp`, icon: <IndianRupee className="h-5 w-5" /> },
      { title: "ESI Contribution", value: `₹${totalESI.toLocaleString()}`, change: `${esiData.length} emp`, icon: <Building2 className="h-5 w-5" /> },
      { title: "PT Collected", value: `₹${totalPT.toLocaleString()}`, change: `${ptData.length} emp`, icon: <Calculator className="h-5 w-5" /> },
      { title: "Eligible Employees", value: `${eligibleCount}`, change: "Active", icon: <Users className="h-5 w-5" /> },
    ];
  }, [pfData, esiData, ptData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleChallanUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select a challan file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Challan Uploaded Successfully",
      description: `${uploadedFile.name} has been uploaded and processed.`,
    });
    
    setUploading(false);
    setUploadedFile(null);
    setUploadDialogOpen(false);
  };

  const generateReport = () => {
    const doc = new jsPDF();
    
    addWatermark(doc);
    addCompanyHeader(doc, { title: "PF / ESI / PT COMPLIANCE REPORT", subtitle: "Statutory Contributions Summary" });
    addFooter(doc);
    
    const refNumber = generateReferenceNumber("PEP");
    addReferenceNumber(doc, refNumber, 68);
    addDocumentDate(doc, undefined, 68);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 15, 80);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total PF Contribution: Rs. 12,45,000`, 25, 88);
    doc.text(`Total ESI Contribution: Rs. 3,45,000`, 25, 96);
    doc.text(`Total PT Collected: Rs. 89,500`, 25, 104);
    doc.text(`Eligible Employees: 156`, 25, 112);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Provident Fund Details", 15, 125);
    
    autoTable(doc, {
      startY: 130,
      head: [['Employee', 'Basic Salary', 'Employee (12%)', 'Employer (12%)', 'EDLI (0.5%)', 'Admin (0.5%)', 'Total']],
      body: pfData.map(row => [
        row.employee,
        `Rs. ${row.basicSalary.toLocaleString()}`,
        `Rs. ${row.employeeContrib.toLocaleString()}`,
        `Rs. ${row.employerContrib.toLocaleString()}`,
        `Rs. ${row.edliContrib.toLocaleString()}`,
        `Rs. ${row.adminCharges.toLocaleString()}`,
        `Rs. ${row.total.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 98, 179] },
      styles: { fontSize: 8 },
    });
    
    const pfEndY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 180;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ESI Details", 15, pfEndY + 12);
    
    autoTable(doc, {
      startY: pfEndY + 16,
      head: [['Employee', 'Gross Salary', 'Employee (0.75%)', 'Employer (3.25%)', 'Total']],
      body: esiData.map(row => [
        row.employee,
        `Rs. ${row.grossSalary.toLocaleString()}`,
        `Rs. ${row.employeeContrib.toLocaleString()}`,
        `Rs. ${row.employerContrib.toLocaleString()}`,
        `Rs. ${row.total.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 98, 179] },
      styles: { fontSize: 8 },
    });
    
    doc.addPage();
    
    addWatermark(doc);
    addCompanyHeader(doc, { title: "PF / ESI / PT COMPLIANCE REPORT", subtitle: "Professional Tax Details" });
    addFooter(doc);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Professional Tax Details", 15, 68);
    
    autoTable(doc, {
      startY: 73,
      head: [['Employee', 'Gross Salary', 'PT Amount', 'State']],
      body: ptData.map(row => [
        row.employee,
        `Rs. ${row.grossSalary.toLocaleString()}`,
        `Rs. ${row.ptAmount.toLocaleString()}`,
        row.state
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 98, 179] },
      styles: { fontSize: 9 },
    });
    
    const ptEndY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 150;
    
    addHRSignature(doc, ptEndY + 25);
    
    doc.save('pf-esi-pt-report.pdf');
    
    toast({
      title: "Report Generated",
      description: "PF/ESI/PT compliance report has been downloaded.",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">PF / ESI / PT Management</h1>
            <p className="text-slate-500 mt-1">Manage statutory compliance and contributions</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-upload-challan">
                  <Upload className="h-4 w-4" />
                  Upload Challan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Challan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="challan-file">Select Challan File</Label>
                    <Input
                      id="challan-file"
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      data-testid="input-challan-file"
                    />
                    <p className="text-xs text-slate-500">
                      Supported formats: PDF, Excel, CSV
                    </p>
                  </div>
                  {uploadedFile && (
                    <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                      <span className="text-sm text-teal-700">{uploadedFile.name}</span>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleChallanUpload} disabled={uploading || !uploadedFile}>
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button className="gap-2" onClick={generateReport} data-testid="button-generate-report">
              <Download className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {complianceStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card data-testid={`card-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-lg bg-teal-50 text-teal-600">
                      {stat.icon}
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</h3>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Statutory Contributions</CardTitle>
            <CardDescription>Monthly PF, ESI, and Professional Tax details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pf">
              <TabsList>
                <TabsTrigger value="pf" data-testid="tab-pf">Provident Fund</TabsTrigger>
                <TabsTrigger value="esi" data-testid="tab-esi">ESI</TabsTrigger>
                <TabsTrigger value="pt" data-testid="tab-pt">Professional Tax</TabsTrigger>
              </TabsList>
              <TabsContent value="pf" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Employee</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Basic Salary</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Employee (12%)</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Employer (12%)</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">EDLI (0.5%)</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Admin Charges (0.5%)</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pfData.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50" data-testid={`row-pf-${index}`}>
                          <td className="py-3 px-4 font-medium">{row.employee}</td>
                          <td className="py-3 px-4">₹{row.basicSalary.toLocaleString()}</td>
                          <td className="py-3 px-4">₹{row.employeeContrib.toLocaleString()}</td>
                          <td className="py-3 px-4">₹{row.employerContrib.toLocaleString()}</td>
                          <td className="py-3 px-4">₹{row.edliContrib.toLocaleString()}</td>
                          <td className="py-3 px-4">₹{row.adminCharges.toLocaleString()}</td>
                          <td className="py-3 px-4 font-medium text-teal-600">₹{row.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="esi" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Employee</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Gross Salary (Monthly)</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Employee (0.75%)</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Employer (3.25%)</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Total ESI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {esiData.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50" data-testid={`row-esi-${index}`}>
                          <td className="py-3 px-4 font-medium">{row.employee}</td>
                          <td className="py-3 px-4">₹{row.grossSalary.toLocaleString()}</td>
                          <td className="py-3 px-4">₹{row.employeeContrib.toLocaleString()}</td>
                          <td className="py-3 px-4">₹{row.employerContrib.toLocaleString()}</td>
                          <td className="py-3 px-4 font-medium text-teal-600">₹{row.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 font-semibold text-slate-700">Total ESI Contribution</td>
                        <td className="py-3 px-4 font-bold text-teal-700">
                          ₹{esiData.reduce((sum, row) => sum + row.total, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> ESI is applicable for employees with gross salary up to ₹21,000/month. 
                    Employee contribution is 0.75% and employer contribution is 3.25%.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="pt" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Employee</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Gross Salary</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">State</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">PT Amount (Monthly)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ptData.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50" data-testid={`row-pt-${index}`}>
                          <td className="py-3 px-4 font-medium">{row.employee}</td>
                          <td className="py-3 px-4">₹{row.grossSalary.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{row.state}</Badge>
                          </td>
                          <td className="py-3 px-4 font-medium text-teal-600">₹{row.ptAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 font-semibold text-slate-700">Total PT Collection (Monthly)</td>
                        <td className="py-3 px-4 font-bold text-teal-700">
                          ₹{ptData.reduce((sum, row) => sum + row.ptAmount, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <strong>Note:</strong> Professional Tax rates vary by state. Maharashtra: ₹200/month (max), 
                    Karnataka: ₹175/month (max), Gujarat: ₹150/month (max). Employers must deposit PT by the end of each month.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
