import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Download, Calendar, TrendingUp, Users, Clock, Search, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber } from "@/lib/pdf-utils";

export default function LeaveReportPage() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const leaveStats = [
    { title: "Total Leave Taken", value: "456", icon: <CalendarDays className="h-5 w-5" />, color: "bg-teal-50 text-teal-600" },
    { title: "Pending Requests", value: "12", icon: <Clock className="h-5 w-5" />, color: "bg-yellow-50 text-yellow-600" },
    { title: "Avg. Leave/Employee", value: "8.5", icon: <Users className="h-5 w-5" />, color: "bg-blue-50 text-blue-600" },
    { title: "Leave Balance", value: "1,245", icon: <TrendingUp className="h-5 w-5" />, color: "bg-green-50 text-green-600" },
  ];

  const leaveTypeData = [
    { type: "Casual Leave", taken: 156, balance: 312, utilized: 33 },
    { type: "Sick Leave", taken: 89, balance: 267, utilized: 25 },
    { type: "Earned Leave", taken: 134, balance: 445, utilized: 23 },
    { type: "WFH", taken: 67, balance: 178, utilized: 27 },
    { type: "Maternity/Paternity", taken: 10, balance: 45, utilized: 18 },
  ];

  const filteredData = leaveTypeData.filter(item =>
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    addWatermark(doc);
    addCompanyHeader(doc, { title: "LEAVE REPORT", subtitle: `Year: ${selectedYear}` });
    addFooter(doc);
    
    const refNumber = generateReferenceNumber("LVE");
    addReferenceNumber(doc, refNumber, 68);
    addDocumentDate(doc, undefined, 68);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Summary:", 15, 80);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Total Leave Taken: 456 days", 25, 88);
    doc.text("Pending Requests: 12", 25, 96);
    doc.text("Avg. Leave/Employee: 8.5 days", 25, 104);
    doc.text("Total Leave Balance: 1,245 days", 25, 112);
    
    doc.setFont("helvetica", "bold");
    doc.text("Leave Type Breakdown:", 15, 125);
    
    let yPos = 135;
    doc.setFontSize(9);
    doc.text("Leave Type", 15, yPos);
    doc.text("Taken", 75, yPos);
    doc.text("Balance", 110, yPos);
    doc.text("Utilization %", 150, yPos);
    
    doc.setFont("helvetica", "normal");
    yPos += 8;
    filteredData.forEach((item) => {
      doc.text(item.type, 15, yPos);
      doc.text(`${item.taken} days`, 75, yPos);
      doc.text(`${item.balance} days`, 110, yPos);
      doc.text(`${item.utilized}%`, 150, yPos);
      yPos += 7;
    });
    
    addHRSignature(doc, yPos + 25);
    
    doc.save(`leave_report_${selectedYear}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: `Leave report for ${selectedYear} downloaded successfully.`
    });
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map(item => ({
      "Leave Type": item.type,
      "Days Taken": item.taken,
      "Days Balance": item.balance,
      "Utilization (%)": item.utilized
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leave Report");
    XLSX.writeFile(wb, `leave_report_${selectedYear}.xlsx`);

    toast({
      title: "Excel Exported",
      description: `Leave report exported to Excel successfully.`
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
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Leave Reports</h1>
            <p className="text-slate-500 mt-1">Leave utilization analysis and trends</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32" data-testid="select-year">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
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
          {leaveStats.map((stat, index) => (
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
                  <CalendarDays className="h-5 w-5 text-teal-600" />
                  Leave Type Summary
                </CardTitle>
                <CardDescription>Leave utilization by type for {selectedYear}</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search leave type..."
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
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Leave Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Taken</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Balance</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Utilization</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50" data-testid={`row-leave-${index}`}>
                      <td className="py-3 px-4 font-medium">{item.type}</td>
                      <td className="py-3 px-4">{item.taken} days</td>
                      <td className="py-3 px-4">{item.balance} days</td>
                      <td className="py-3 px-4">{item.utilized}%</td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-teal-600 h-2 rounded-full" 
                            style={{ width: `${item.utilized}%` }}
                          />
                        </div>
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
