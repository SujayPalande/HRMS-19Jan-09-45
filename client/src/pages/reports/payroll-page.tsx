import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Download, Calendar, TrendingUp, Users, Wallet, Search, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber, COMPANY_NAME } from "@/lib/pdf-utils";

export default function PayrollReportPage() {
  const [selectedMonth, setSelectedMonth] = useState("January 2024");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const payrollStats = [
    { title: "Total Payroll", value: "₹45,60,000", icon: <IndianRupee className="h-5 w-5" />, color: "bg-teal-50 text-teal-600" },
    { title: "Net Disbursed", value: "₹38,25,000", icon: <Wallet className="h-5 w-5" />, color: "bg-green-50 text-green-600" },
    { title: "Total Deductions", value: "₹7,35,000", icon: <TrendingUp className="h-5 w-5" />, color: "bg-red-50 text-red-600" },
    { title: "Employees Paid", value: "156", icon: <Users className="h-5 w-5" />, color: "bg-blue-50 text-blue-600" },
  ];

  const departmentPayroll = [
    { department: "Engineering", employees: 45, gross: 1850000, deductions: 296000, net: 1554000 },
    { department: "Sales", employees: 32, gross: 1120000, deductions: 179200, net: 940800 },
    { department: "Marketing", employees: 18, gross: 720000, deductions: 115200, net: 604800 },
    { department: "HR", employees: 12, gross: 480000, deductions: 76800, net: 403200 },
    { department: "Finance", employees: 15, gross: 600000, deductions: 96000, net: 504000 },
  ];

  const filteredData = departmentPayroll.filter(dept =>
    dept.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    addWatermark(doc);
    addCompanyHeader(doc, { title: "PAYROLL REPORT", subtitle: `Period: ${selectedMonth}` });
    addFooter(doc);
    
    const refNumber = generateReferenceNumber("PAY");
    addReferenceNumber(doc, refNumber, 68);
    addDocumentDate(doc, undefined, 68);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Summary:", 15, 80);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Total Payroll: Rs. 45,60,000", 25, 88);
    doc.text("Net Disbursed: Rs. 38,25,000", 25, 96);
    doc.text("Total Deductions: Rs. 7,35,000", 25, 104);
    doc.text("Employees Paid: 156", 25, 112);
    
    doc.setFont("helvetica", "bold");
    doc.text("Department-wise Breakdown:", 15, 125);
    
    let yPos = 135;
    doc.setFontSize(9);
    doc.text("Department", 15, yPos);
    doc.text("Employees", 55, yPos);
    doc.text("Gross Salary", 85, yPos);
    doc.text("Deductions", 125, yPos);
    doc.text("Net Salary", 165, yPos);
    
    doc.setFont("helvetica", "normal");
    yPos += 8;
    filteredData.forEach((dept) => {
      doc.text(dept.department, 15, yPos);
      doc.text(dept.employees.toString(), 55, yPos);
      doc.text(formatCurrency(dept.gross), 85, yPos);
      doc.text(formatCurrency(dept.deductions), 125, yPos);
      doc.text(formatCurrency(dept.net), 165, yPos);
      yPos += 7;
    });
    
    addHRSignature(doc, yPos + 25);
    
    doc.save(`payroll_report_${selectedMonth.replace(/\s+/g, '_')}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: `Payroll report for ${selectedMonth} downloaded successfully.`
    });
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map(dept => ({
      "Department": dept.department,
      "Employees": dept.employees,
      "Gross Salary": dept.gross,
      "Deductions": dept.deductions,
      "Net Salary": dept.net
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Report");
    XLSX.writeFile(wb, `payroll_report_${selectedMonth.replace(/\s+/g, '_')}.xlsx`);

    toast({
      title: "Excel Exported",
      description: `Payroll report exported to Excel successfully.`
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
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Payroll Reports</h1>
            <p className="text-slate-500 mt-1">Comprehensive payroll analysis and summaries</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40" data-testid="select-month">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="January 2024">January 2024</SelectItem>
                <SelectItem value="December 2023">December 2023</SelectItem>
                <SelectItem value="November 2023">November 2023</SelectItem>
                <SelectItem value="October 2023">October 2023</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExportPDF} data-testid="button-export-pdf">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportExcel} data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {payrollStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card data-testid={`card-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-teal-600" />
                  Department-wise Payroll Summary
                </CardTitle>
                <CardDescription>Payroll breakdown by department for {selectedMonth}</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search department..."
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
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Employees</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Gross Salary</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Deductions</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((dept, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50" data-testid={`row-payroll-${index}`}>
                      <td className="py-3 px-4 font-medium">{dept.department}</td>
                      <td className="py-3 px-4">{dept.employees}</td>
                      <td className="py-3 px-4">{formatCurrency(dept.gross)}</td>
                      <td className="py-3 px-4 text-red-600">{formatCurrency(dept.deductions)}</td>
                      <td className="py-3 px-4 font-medium text-green-600">{formatCurrency(dept.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4">{filteredData.reduce((sum, d) => sum + d.employees, 0)}</td>
                    <td className="py-3 px-4">{formatCurrency(filteredData.reduce((sum, d) => sum + d.gross, 0))}</td>
                    <td className="py-3 px-4 text-red-600">{formatCurrency(filteredData.reduce((sum, d) => sum + d.deductions, 0))}</td>
                    <td className="py-3 px-4 text-green-600">{formatCurrency(filteredData.reduce((sum, d) => sum + d.net, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
