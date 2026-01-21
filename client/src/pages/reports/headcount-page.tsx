import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Download, TrendingUp, TrendingDown, Building2, UserPlus, UserMinus, Search, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber } from "@/lib/pdf-utils";

export default function HeadcountReportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("Q4 2023");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const headcountStats = [
    { title: "Total Headcount", value: "156", change: "+12", icon: <Users className="h-5 w-5" /> },
    { title: "New Hires", value: "18", icon: <UserPlus className="h-5 w-5" />, color: "bg-green-50 text-green-600" },
    { title: "Separations", value: "6", icon: <UserMinus className="h-5 w-5" />, color: "bg-red-50 text-red-600" },
    { title: "Growth Rate", value: "8.3%", icon: <TrendingUp className="h-5 w-5" />, color: "bg-blue-50 text-blue-600" },
  ];

  const departmentData = [
    { department: "Engineering", headcount: 45, newHires: 8, separations: 2, growth: 15.4 },
    { department: "Marketing", headcount: 22, newHires: 3, separations: 1, growth: 10.0 },
    { department: "Sales", headcount: 35, newHires: 4, separations: 2, growth: 6.1 },
    { department: "HR", headcount: 12, newHires: 1, separations: 0, growth: 9.1 },
    { department: "Finance", headcount: 18, newHires: 1, separations: 1, growth: 0.0 },
    { department: "Operations", headcount: 24, newHires: 1, separations: 0, growth: 4.3 },
  ];

  const filteredData = departmentData.filter(dept =>
    dept.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    addWatermark(doc);
    addCompanyHeader(doc, { title: "HEADCOUNT REPORT", subtitle: `Period: ${selectedPeriod}` });
    addFooter(doc);
    
    const refNumber = generateReferenceNumber("HDC");
    addReferenceNumber(doc, refNumber, 68);
    addDocumentDate(doc, undefined, 68);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Summary:", 15, 80);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Total Headcount: 156 employees", 25, 88);
    doc.text("New Hires: 18", 25, 96);
    doc.text("Separations: 6", 25, 104);
    doc.text("Net Growth Rate: 8.3%", 25, 112);
    
    doc.setFont("helvetica", "bold");
    doc.text("Department-wise Breakdown:", 15, 125);
    
    let yPos = 135;
    doc.setFontSize(9);
    doc.text("Department", 15, yPos);
    doc.text("Headcount", 65, yPos);
    doc.text("New Hires", 100, yPos);
    doc.text("Separations", 135, yPos);
    doc.text("Growth %", 170, yPos);
    
    doc.setFont("helvetica", "normal");
    yPos += 8;
    filteredData.forEach((dept) => {
      doc.text(dept.department, 15, yPos);
      doc.text(dept.headcount.toString(), 65, yPos);
      doc.text(dept.newHires.toString(), 100, yPos);
      doc.text(dept.separations.toString(), 135, yPos);
      doc.text(`${dept.growth}%`, 170, yPos);
      yPos += 7;
    });
    
    addHRSignature(doc, yPos + 25);
    
    doc.save(`headcount_report_${selectedPeriod.replace(/\s+/g, '_')}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: `Headcount report for ${selectedPeriod} downloaded successfully.`
    });
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map(dept => ({
      "Department": dept.department,
      "Headcount": dept.headcount,
      "New Hires": dept.newHires,
      "Separations": dept.separations,
      "Growth (%)": dept.growth
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Headcount Report");
    XLSX.writeFile(wb, `headcount_report_${selectedPeriod.replace(/\s+/g, '_')}.xlsx`);

    toast({
      title: "Excel Exported",
      description: `Headcount report exported to Excel successfully.`
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
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Headcount Report</h1>
            <p className="text-slate-500 mt-1">Employee headcount analysis by department</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q4 2023">Q4 2023</SelectItem>
                <SelectItem value="Q3 2023">Q3 2023</SelectItem>
                <SelectItem value="Q2 2023">Q2 2023</SelectItem>
                <SelectItem value="Q1 2023">Q1 2023</SelectItem>
                <SelectItem value="Q4 2022">Q4 2022</SelectItem>
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
          {headcountStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card data-testid={`card-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${stat.color || "bg-teal-50 text-teal-600"}`}>
                      {stat.icon}
                    </div>
                    {stat.change && (
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {stat.change}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</p>
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
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  Department Headcount - {selectedPeriod}
                </CardTitle>
                <CardDescription>Headcount breakdown by department</CardDescription>
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
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Headcount</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">New Hires</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Separations</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((dept, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50" data-testid={`row-dept-${index}`}>
                      <td className="py-3 px-4 font-medium">{dept.department}</td>
                      <td className="py-3 px-4">{dept.headcount}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-green-600">
                          <UserPlus className="h-4 w-4" />
                          {dept.newHires}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-red-600">
                          <UserMinus className="h-4 w-4" />
                          {dept.separations}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={dept.growth > 0 ? "default" : "secondary"} className="gap-1">
                          {dept.growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {dept.growth}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
