import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, FileText, Download, Upload, IndianRupee, Users, Building2, TrendingUp, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber, COMPANY_NAME, COMPANY_ADDRESS } from "@/lib/pdf-utils";

export default function PfEsiPtPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  const complianceStats = [
    { title: "Total PF Contribution", value: "₹12,45,000", change: "+8.2%", icon: <IndianRupee className="h-5 w-5" /> },
    { title: "ESI Contribution", value: "₹3,45,000", change: "+5.4%", icon: <Building2 className="h-5 w-5" /> },
    { title: "PT Collected", value: "₹89,500", change: "+2.1%", icon: <Calculator className="h-5 w-5" /> },
    { title: "Eligible Employees", value: "156", change: "+12", icon: <Users className="h-5 w-5" /> },
  ];

  const pfData = [
    { employee: "John Doe", basicSalary: 50000, employeeContrib: 6000, employerContrib: 6000, total: 12000 },
    { employee: "Jane Smith", basicSalary: 45000, employeeContrib: 5400, employerContrib: 5400, total: 10800 },
    { employee: "Mike Johnson", basicSalary: 55000, employeeContrib: 6600, employerContrib: 6600, total: 13200 },
    { employee: "Sarah Wilson", basicSalary: 48000, employeeContrib: 5760, employerContrib: 5760, total: 11520 },
    { employee: "Rahul Sharma", basicSalary: 52000, employeeContrib: 6240, employerContrib: 6240, total: 12480 },
    { employee: "Priya Patel", basicSalary: 47000, employeeContrib: 5640, employerContrib: 5640, total: 11280 },
  ];

  const esiData = [
    { employee: "John Doe", grossSalary: 18000, employeeContrib: 135, employerContrib: 585, total: 720 },
    { employee: "Jane Smith", grossSalary: 16500, employeeContrib: 124, employerContrib: 536, total: 660 },
    { employee: "Mike Johnson", grossSalary: 19000, employeeContrib: 143, employerContrib: 618, total: 761 },
    { employee: "Amit Kumar", grossSalary: 17500, employeeContrib: 131, employerContrib: 569, total: 700 },
    { employee: "Neha Gupta", grossSalary: 20000, employeeContrib: 150, employerContrib: 650, total: 800 },
    { employee: "Raj Verma", grossSalary: 15000, employeeContrib: 113, employerContrib: 488, total: 601 },
  ];

  const ptData = [
    { employee: "John Doe", grossSalary: 75000, ptAmount: 200, state: "Maharashtra" },
    { employee: "Jane Smith", grossSalary: 65000, ptAmount: 200, state: "Maharashtra" },
    { employee: "Mike Johnson", grossSalary: 85000, ptAmount: 200, state: "Maharashtra" },
    { employee: "Sarah Wilson", grossSalary: 55000, ptAmount: 175, state: "Karnataka" },
    { employee: "Rahul Sharma", grossSalary: 72000, ptAmount: 200, state: "Maharashtra" },
    { employee: "Priya Patel", grossSalary: 45000, ptAmount: 150, state: "Gujarat" },
    { employee: "Amit Kumar", grossSalary: 38000, ptAmount: 150, state: "Gujarat" },
    { employee: "Neha Gupta", grossSalary: 95000, ptAmount: 200, state: "Maharashtra" },
  ];

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
      head: [['Employee', 'Basic Salary', 'Employee (12%)', 'Employer (12%)', 'Total']],
      body: pfData.map(row => [
        row.employee,
        `Rs. ${row.basicSalary.toLocaleString()}`,
        `Rs. ${row.employeeContrib.toLocaleString()}`,
        `Rs. ${row.employerContrib.toLocaleString()}`,
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
