import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Download, Search, Calendar, IndianRupee, CheckCircle, Clock, AlertCircle, Loader2, Plus, FilePlus } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber, COMPANY_NAME, COMPANY_ADDRESS, HR_NAME, HR_DESIGNATION } from "@/lib/pdf-utils";

export default function Form16TdsPage() {
  const [selectedYear, setSelectedYear] = useState("2023-24");
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [showBasicForm16Dialog, setShowBasicForm16Dialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [basicForm16Data, setBasicForm16Data] = useState({
    employeeName: "",
    pan: "",
    address: "",
    assessmentYear: "2024-25",
    employerName: "HRMS Connect Pvt. Ltd.",
    employerTan: "MUMH12345F",
    grossSalary: "",
    basicSalary: "",
    hra: "",
    otherAllowances: "",
    standardDeduction: "50000",
    section80C: "",
    section80D: "",
    otherDeductions: "",
    tdsDeducted: "",
  });

  const resetBasicForm16 = () => {
    setBasicForm16Data({
      employeeName: "",
      pan: "",
      address: "",
      assessmentYear: "2024-25",
      employerName: "HRMS Connect Pvt. Ltd.",
      employerTan: "MUMH12345F",
      grossSalary: "",
      basicSalary: "",
      hra: "",
      otherAllowances: "",
      standardDeduction: "50000",
      section80C: "",
      section80D: "",
      otherDeductions: "",
      tdsDeducted: "",
    });
  };

  const tdsStats = [
    { title: "Total TDS Deducted", value: "Rs.45,67,000", status: "success", icon: <IndianRupee className="h-5 w-5" /> },
    { title: "Form 16 Generated", value: "142", status: "success", icon: <FileText className="h-5 w-5" /> },
    { title: "Pending Generation", value: "14", status: "warning", icon: <Clock className="h-5 w-5" /> },
    { title: "Filed with Dept", value: "128", status: "success", icon: <CheckCircle className="h-5 w-5" /> },
  ];

  const [employeeTds, setEmployeeTds] = useState([
    { id: 1, employee: "John Doe", pan: "ABCDE1234F", totalIncome: 1200000, tdsDeducted: 120000, form16: "Generated" },
    { id: 2, employee: "Jane Smith", pan: "FGHIJ5678K", totalIncome: 980000, tdsDeducted: 85000, form16: "Generated" },
    { id: 3, employee: "Mike Johnson", pan: "LMNOP9012Q", totalIncome: 1500000, tdsDeducted: 180000, form16: "Pending" },
    { id: 4, employee: "Sarah Wilson", pan: "RSTUV3456W", totalIncome: 850000, tdsDeducted: 65000, form16: "Generated" },
    { id: 5, employee: "Rahul Sharma", pan: "WXYZ7890A", totalIncome: 720000, tdsDeducted: 52000, form16: "Pending" },
    { id: 6, employee: "Priya Patel", pan: "BCDGH4567E", totalIncome: 1100000, tdsDeducted: 98000, form16: "Generated" },
    { id: 7, employee: "Amit Kumar", pan: "EFGIJ1234K", totalIncome: 680000, tdsDeducted: 45000, form16: "Pending" },
    { id: 8, employee: "Neha Gupta", pan: "HIJKL8901M", totalIncome: 1350000, tdsDeducted: 145000, form16: "Generated" },
    { id: 9, employee: "Raj Verma", pan: "KLMNO5678P", totalIncome: 920000, tdsDeducted: 78000, form16: "Pending" },
    { id: 10, employee: "Pooja Singh", pan: "NOPQR2345S", totalIncome: 1050000, tdsDeducted: 92000, form16: "Generated" },
  ]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employeeTds;
    const query = searchQuery.toLowerCase();
    return employeeTds.filter(
      emp => 
        emp.employee.toLowerCase().includes(query) || 
        emp.pan.toLowerCase().includes(query)
    );
  }, [employeeTds, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Generated": return "bg-green-100 text-green-700";
      case "Pending": return "bg-yellow-100 text-yellow-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const generateForm16PDF = (employee: typeof employeeTds[0]) => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    
    addFooter(doc);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("FORM NO. 16", 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("[See rule 31(1)(a)]", 105, 27, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Certificate under section 203 of the Income-tax Act, 1961", 105, 35, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`for Tax Deducted at Source on Salary - FY ${selectedYear}`, 105, 42, { align: 'center' });
    
    const refNumber = generateReferenceNumber("F16");
    doc.setFontSize(9);
    doc.text(`Ref No: ${refNumber}`, 14, 50);
    doc.text(`Generated on: ${currentDate}`, 196, 50, { align: 'right' });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Part A - Details of Employer and Employee", 14, 60);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, 63, 196, 63);
    
    autoTable(doc, {
      startY: 67,
      head: [],
      body: [
        ['Name of the Deductor (Employer)', COMPANY_NAME],
        ['TAN of the Deductor', 'PNEC12345F'],
        ['Address of the Deductor', COMPANY_ADDRESS],
        ['Name of the Employee', employee.employee],
        ['PAN of the Employee', employee.pan],
        ['Assessment Year', selectedYear === '2023-24' ? '2024-25' : selectedYear === '2022-23' ? '2023-24' : '2022-23'],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 110 },
      },
    });
    
    const partAEndY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Part B - Details of Salary Paid and Tax Deducted", 14, partAEndY + 12);
    doc.setDrawColor(0, 0, 0);
    doc.line(14, partAEndY + 15, 196, partAEndY + 15);
    
    const basicSalary = Math.round(employee.totalIncome * 0.5);
    const hra = Math.round(employee.totalIncome * 0.2);
    const allowances = Math.round(employee.totalIncome * 0.2);
    const bonus = Math.round(employee.totalIncome * 0.1);
    
    autoTable(doc, {
      startY: partAEndY + 19,
      head: [['Particulars', 'Amount (Rs.)']],
      body: [
        ['1. Gross Salary', `Rs.${employee.totalIncome.toLocaleString()}`],
        ['   a) Basic Salary', `Rs.${basicSalary.toLocaleString()}`],
        ['   b) House Rent Allowance', `Rs.${hra.toLocaleString()}`],
        ['   c) Other Allowances', `Rs.${allowances.toLocaleString()}`],
        ['   d) Bonus/Incentive', `Rs.${bonus.toLocaleString()}`],
        ['2. Less: Standard Deduction u/s 16(ia)', 'Rs.50,000'],
        ['3. Net Taxable Income', `Rs.${(employee.totalIncome - 50000).toLocaleString()}`],
        ['4. Tax Payable', `Rs.${employee.tdsDeducted.toLocaleString()}`],
        ['5. Less: Rebate u/s 87A', 'Rs.0'],
        ['6. Tax Deducted at Source', `Rs.${employee.tdsDeducted.toLocaleString()}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [80, 80, 80] },
      styles: { fontSize: 9 },
    });
    
    doc.save(`Form16_${employee.employee.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
  };

  const generateBasicForm16PDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    const grossSalary = parseInt(basicForm16Data.grossSalary) || 0;
    const basicSalary = parseInt(basicForm16Data.basicSalary) || 0;
    const hra = parseInt(basicForm16Data.hra) || 0;
    const otherAllowances = parseInt(basicForm16Data.otherAllowances) || 0;
    const standardDeduction = parseInt(basicForm16Data.standardDeduction) || 50000;
    const section80C = parseInt(basicForm16Data.section80C) || 0;
    const section80D = parseInt(basicForm16Data.section80D) || 0;
    const otherDeductions = parseInt(basicForm16Data.otherDeductions) || 0;
    const tdsDeducted = parseInt(basicForm16Data.tdsDeducted) || 0;

    const totalDeductions = standardDeduction + section80C + section80D + otherDeductions;
    const taxableIncome = Math.max(0, grossSalary - totalDeductions);
    
    addFooter(doc);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("FORM NO. 16", 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("[See rule 31(1)(a)]", 105, 27, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Certificate under section 203 of the Income-tax Act, 1961", 105, 35, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`for Tax Deducted at Source on Salary - AY ${basicForm16Data.assessmentYear}`, 105, 42, { align: 'center' });
    
    const refNumber = generateReferenceNumber("F16");
    doc.setFontSize(9);
    doc.text(`Ref No: ${refNumber}`, 14, 50);
    doc.text(`Generated on: ${currentDate}`, 196, 50, { align: 'right' });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Part A - Details of Employer and Employee", 14, 60);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, 63, 196, 63);
    
    autoTable(doc, {
      startY: 67,
      head: [],
      body: [
        ['Name of the Deductor (Employer)', basicForm16Data.employerName || COMPANY_NAME],
        ['TAN of the Deductor', basicForm16Data.employerTan || 'PNEC12345F'],
        ['Address of the Deductor', COMPANY_ADDRESS],
        ['Name of the Employee', basicForm16Data.employeeName],
        ['PAN of the Employee', basicForm16Data.pan],
        ['Address of the Employee', basicForm16Data.address || 'N/A'],
        ['Assessment Year', basicForm16Data.assessmentYear],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 110 },
      },
    });
    
    const partAEndY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Part B - Details of Salary Paid and Tax Deducted", 14, partAEndY + 12);
    doc.setDrawColor(0, 0, 0);
    doc.line(14, partAEndY + 15, 196, partAEndY + 15);
    
    autoTable(doc, {
      startY: partAEndY + 19,
      head: [['Particulars', 'Amount (Rs.)']],
      body: [
        ['1. Gross Salary', `Rs.${grossSalary.toLocaleString()}`],
        ['   a) Basic Salary', `Rs.${basicSalary.toLocaleString()}`],
        ['   b) House Rent Allowance', `Rs.${hra.toLocaleString()}`],
        ['   c) Other Allowances', `Rs.${otherAllowances.toLocaleString()}`],
        ['2. Less: Standard Deduction u/s 16(ia)', `Rs.${standardDeduction.toLocaleString()}`],
        ['3. Less: Deductions under Chapter VI-A', ''],
        ['   a) Section 80C', `Rs.${section80C.toLocaleString()}`],
        ['   b) Section 80D', `Rs.${section80D.toLocaleString()}`],
        ['   c) Other Deductions', `Rs.${otherDeductions.toLocaleString()}`],
        ['4. Total Deductions', `Rs.${totalDeductions.toLocaleString()}`],
        ['5. Net Taxable Income', `Rs.${taxableIncome.toLocaleString()}`],
        ['6. Tax Deducted at Source', `Rs.${tdsDeducted.toLocaleString()}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [80, 80, 80] },
      styles: { fontSize: 9 },
    });
    
    doc.save(`Form16_${basicForm16Data.employeeName.replace(/\s+/g, '_')}_${basicForm16Data.assessmentYear}.pdf`);
  };

  const handleGenerateForm16 = async (index: number) => {
    setGeneratingIndex(index);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const employee = employeeTds.find((_, i) => i === index);
    if (employee) {
      generateForm16PDF(employee);
      setEmployeeTds(prev => prev.map((emp, i) => 
        i === index ? { ...emp, form16: "Generated" } : emp
      ));
      toast({
        title: "Form 16 Generated",
        description: `Form 16 for ${employee.employee} has been generated and downloaded.`,
      });
    }
    
    setGeneratingIndex(null);
  };

  const handleDownloadForm16 = (employee: typeof employeeTds[0]) => {
    generateForm16PDF(employee);
    toast({
      title: "Form 16 Downloaded",
      description: `Form 16 for ${employee.employee} has been downloaded.`,
    });
  };

  const handleGenerateAllForm16 = async () => {
    const pendingEmployees = employeeTds.filter(emp => emp.form16 === "Pending");
    
    if (pendingEmployees.length === 0) {
      toast({
        title: "No Pending Form 16",
        description: "All Form 16 have already been generated.",
      });
      return;
    }

    setGeneratingAll(true);
    
    for (const employee of pendingEmployees) {
      await new Promise(resolve => setTimeout(resolve, 500));
      generateForm16PDF(employee);
    }
    
    setEmployeeTds(prev => prev.map(emp => ({ ...emp, form16: "Generated" })));
    
    toast({
      title: "All Form 16 Generated",
      description: `${pendingEmployees.length} Form 16 certificates have been generated and downloaded.`,
    });
    
    setGeneratingAll(false);
  };

  const handleGenerateBasicForm16 = async () => {
    const grossSalaryValue = parseInt(basicForm16Data.grossSalary) || 0;
    const tdsValue = parseInt(basicForm16Data.tdsDeducted) || 0;
    
    if (!basicForm16Data.employeeName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter employee name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!basicForm16Data.pan.trim() || basicForm16Data.pan.trim().length !== 10) {
      toast({
        title: "Invalid PAN",
        description: "Please enter a valid 10-character PAN number.",
        variant: "destructive",
      });
      return;
    }
    
    if (grossSalaryValue <= 0) {
      toast({
        title: "Invalid Gross Salary",
        description: "Please enter a valid gross salary amount.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    generateBasicForm16PDF();

    toast({
      title: "Form 16 Generated",
      description: `Basic Form 16 for ${basicForm16Data.employeeName} has been generated and downloaded.`,
    });

    setIsSubmitting(false);
    setShowBasicForm16Dialog(false);
    resetBasicForm16();
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
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Form 16 & TDS Management</h1>
            <p className="text-slate-500 mt-1">Manage TDS deductions and Form 16 generation</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32" data-testid="select-year">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-25">2024-25</SelectItem>
                <SelectItem value="2023-24">2023-24</SelectItem>
                <SelectItem value="2022-23">2022-23</SelectItem>
                <SelectItem value="2021-22">2021-22</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              className="gap-2" 
              onClick={() => { resetBasicForm16(); setShowBasicForm16Dialog(true); }}
              data-testid="button-basic-form16"
            >
              <FilePlus className="h-4 w-4" />
              Basic Form 16
            </Button>
            <Button 
              className="gap-2" 
              onClick={handleGenerateAllForm16}
              disabled={generatingAll}
              data-testid="button-generate-all"
            >
              {generatingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate All Form 16
                </>
              )}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tdsStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card data-testid={`card-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${stat.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {stat.icon}
                    </div>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Employee TDS Details</CardTitle>
                <CardDescription>TDS deductions and Form 16 status for FY {selectedYear}</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search employee or PAN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">PAN</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Total Income</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">TDS Deducted</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Form 16</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No employees found matching "{searchQuery}"
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((row, index) => (
                      <tr key={row.id} className="border-b hover:bg-slate-50" data-testid={`row-tds-${index}`}>
                        <td className="py-3 px-4 font-medium">{row.employee}</td>
                        <td className="py-3 px-4 font-mono text-sm">{row.pan}</td>
                        <td className="py-3 px-4">Rs.{row.totalIncome.toLocaleString()}</td>
                        <td className="py-3 px-4">Rs.{row.tdsDeducted.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(row.form16)}>{row.form16}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {row.form16 === "Generated" ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="gap-1" 
                                onClick={() => handleDownloadForm16(row)}
                                data-testid={`button-download-${index}`}
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                className="gap-1" 
                                onClick={() => handleGenerateForm16(employeeTds.findIndex(e => e.id === row.id))}
                                disabled={generatingIndex !== null}
                                data-testid={`button-generate-${index}`}
                              >
                                {generatingIndex === employeeTds.findIndex(e => e.id === row.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3 w-3" />
                                    Generate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBasicForm16Dialog} onOpenChange={setShowBasicForm16Dialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-teal-600" />
              Create Basic Form 16
            </DialogTitle>
            <DialogDescription>Fill in the details to generate a custom Form 16 certificate</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Employee Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Input
                    id="employeeName"
                    placeholder="Enter full name"
                    value={basicForm16Data.employeeName}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, employeeName: e.target.value }))}
                    data-testid="input-employee-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN Number *</Label>
                  <Input
                    id="pan"
                    placeholder="e.g., ABCDE1234F"
                    value={basicForm16Data.pan}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                    maxLength={10}
                    data-testid="input-pan"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter employee address"
                    value={basicForm16Data.address}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, address: e.target.value }))}
                    data-testid="input-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessmentYear">Assessment Year</Label>
                  <Select value={basicForm16Data.assessmentYear} onValueChange={(value) => setBasicForm16Data(prev => ({ ...prev, assessmentYear: value }))}>
                    <SelectTrigger data-testid="select-assessment-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-26">2025-26</SelectItem>
                      <SelectItem value="2024-25">2024-25</SelectItem>
                      <SelectItem value="2023-24">2023-24</SelectItem>
                      <SelectItem value="2022-23">2022-23</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Employer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employerName">Employer Name</Label>
                  <Input
                    id="employerName"
                    value={basicForm16Data.employerName}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, employerName: e.target.value }))}
                    data-testid="input-employer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employerTan">Employer TAN</Label>
                  <Input
                    id="employerTan"
                    value={basicForm16Data.employerTan}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, employerTan: e.target.value.toUpperCase() }))}
                    data-testid="input-employer-tan"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Salary Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grossSalary">Gross Salary (Rs.) *</Label>
                  <Input
                    id="grossSalary"
                    type="number"
                    placeholder="e.g., 1200000"
                    value={basicForm16Data.grossSalary}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, grossSalary: e.target.value }))}
                    data-testid="input-gross-salary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary (Rs.)</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    placeholder="e.g., 600000"
                    value={basicForm16Data.basicSalary}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, basicSalary: e.target.value }))}
                    data-testid="input-basic-salary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hra">HRA (Rs.)</Label>
                  <Input
                    id="hra"
                    type="number"
                    placeholder="e.g., 240000"
                    value={basicForm16Data.hra}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, hra: e.target.value }))}
                    data-testid="input-hra"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherAllowances">Other Allowances (Rs.)</Label>
                  <Input
                    id="otherAllowances"
                    type="number"
                    placeholder="e.g., 360000"
                    value={basicForm16Data.otherAllowances}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, otherAllowances: e.target.value }))}
                    data-testid="input-other-allowances"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Deductions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="standardDeduction">Standard Deduction (Rs.)</Label>
                  <Input
                    id="standardDeduction"
                    type="number"
                    value={basicForm16Data.standardDeduction}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, standardDeduction: e.target.value }))}
                    data-testid="input-standard-deduction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section80C">Section 80C (Rs.)</Label>
                  <Input
                    id="section80C"
                    type="number"
                    placeholder="e.g., 150000"
                    value={basicForm16Data.section80C}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, section80C: e.target.value }))}
                    data-testid="input-section-80c"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section80D">Section 80D (Rs.)</Label>
                  <Input
                    id="section80D"
                    type="number"
                    placeholder="e.g., 25000"
                    value={basicForm16Data.section80D}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, section80D: e.target.value }))}
                    data-testid="input-section-80d"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherDeductions">Other Deductions (Rs.)</Label>
                  <Input
                    id="otherDeductions"
                    type="number"
                    placeholder="e.g., 50000"
                    value={basicForm16Data.otherDeductions}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, otherDeductions: e.target.value }))}
                    data-testid="input-other-deductions"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Tax Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tdsDeducted">TDS Deducted (Rs.) *</Label>
                  <Input
                    id="tdsDeducted"
                    type="number"
                    placeholder="e.g., 120000"
                    value={basicForm16Data.tdsDeducted}
                    onChange={(e) => setBasicForm16Data(prev => ({ ...prev, tdsDeducted: e.target.value }))}
                    data-testid="input-tds-deducted"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBasicForm16Dialog(false)} data-testid="button-cancel-basic-form16">
              Cancel
            </Button>
            <Button onClick={handleGenerateBasicForm16} disabled={isSubmitting} data-testid="button-generate-basic-form16">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
