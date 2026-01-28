import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  Play, 
  FileSpreadsheet, 
  FileText, 
  Download,
  Users,
  IndianRupee,
  Building2,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, differenceInDays, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth } from "date-fns";
import { User, Department, Attendance } from "@shared/schema";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";

interface PayrollTestResult {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  monthlyCTC: number;
  daysWorked: number;
  daysAbsent: number;
  daysLeave: number;
  totalWorkingDays: number;
  grossSalary: number;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  otherAllowances: number;
  epfEmployee: number;
  epfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  lwf: number;
  bonus: number;
  totalDeductions: number;
  netSalary: number;
  attendanceData: { date: string; status: string }[];
}

interface TestRunSummary {
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalEPFEmployee: number;
  totalEPFEmployer: number;
  totalESICEmployee: number;
  totalESICEmployer: number;
  totalPT: number;
  totalLWF: number;
  totalBonus: number;
  totalDeductions: number;
}

export default function PayrollTestRunPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<"last15" | "last30" | "current_month" | "custom">("last15");
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 15), "yyyy-MM-dd"));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<PayrollTestResult[]>([]);
  const [testCompleted, setTestCompleted] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [includeBonus, setIncludeBonus] = useState(true);
  const [bonusPercentage, setBonusPercentage] = useState(8.33);

  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: systemSettings } = useQuery({
    queryKey: ["/api/settings/system"],
    queryFn: async () => {
      const response = await fetch("/api/settings/system", { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
  });

  const salaryComponents = systemSettings?.salaryComponents || {
    basicSalaryPercentage: 50,
    hraPercentage: 50,
    epfPercentage: 12,
    esicPercentage: 0.75,
    professionalTax: 200
  };

  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case "last15":
        return { start: subDays(today, 14), end: today };
      case "last30":
        return { start: subDays(today, 29), end: today };
      case "current_month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "custom":
        return { start: new Date(customStartDate), end: new Date(customEndDate) };
      default:
        return { start: subDays(today, 14), end: today };
    }
  };

  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return "Unassigned";
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || "Unassigned";
  };

  const generateTestAttendance = (employeeId: number, startDate: Date, endDate: Date) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const attendanceData: { date: string; status: string }[] = [];
    
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const existingRecord = attendanceRecords.find(
        r => r.userId === employeeId && format(new Date(r.date!), "yyyy-MM-dd") === dateStr
      );
      
      if (existingRecord) {
        attendanceData.push({ date: dateStr, status: existingRecord.status });
      } else if (isWeekend(day)) {
        attendanceData.push({ date: dateStr, status: "weekend" });
      } else {
        const random = Math.random();
        if (random < 0.85) {
          attendanceData.push({ date: dateStr, status: "present" });
        } else if (random < 0.92) {
          attendanceData.push({ date: dateStr, status: "leave" });
        } else if (random < 0.97) {
          attendanceData.push({ date: dateStr, status: "halfday" });
        } else {
          attendanceData.push({ date: dateStr, status: "absent" });
        }
      }
    });
    
    return attendanceData;
  };

  const calculatePayroll = (employee: User, attendanceData: { date: string; status: string }[]) => {
    const totalDays = attendanceData.length;
    const weekendDays = attendanceData.filter(d => d.status === "weekend").length;
    const totalWorkingDays = totalDays - weekendDays;
    
    const presentDays = attendanceData.filter(d => d.status === "present").length;
    const halfDays = attendanceData.filter(d => d.status === "halfday").length;
    const leaveDays = attendanceData.filter(d => d.status === "leave").length;
    const absentDays = attendanceData.filter(d => d.status === "absent").length;
    
    const daysWorked = presentDays + (halfDays * 0.5);
    const monthlyCTC = employee.salary || 0;
    const dailyRate = monthlyCTC / 30;
    const grossSalary = dailyRate * daysWorked;
    
    const basicSalary = grossSalary * (salaryComponents.basicSalaryPercentage / 100);
    const hra = basicSalary * (salaryComponents.hraPercentage / 100);
    const da = basicSalary * 0.10;
    const otherAllowances = basicSalary * 0.20;
    const specialAllowance = Math.max(0, grossSalary - (basicSalary + hra + da + otherAllowances));
    
    const epfEmployee = employee.pfApplicable ? Math.round(Math.min(basicSalary, 15000) * 0.12) : 0;
    const epfEmployer = employee.pfApplicable ? Math.round(Math.min(basicSalary, 15000) * 0.13) : 0;
    
    const esicEmployee = employee.esicApplicable && grossSalary <= 21000 
      ? Math.round(grossSalary * 0.0075) : 0;
    const esicEmployer = employee.esicApplicable && grossSalary <= 21000 
      ? Math.round(grossSalary * 0.0325) : 0;
    
    const professionalTax = employee.ptApplicable ? 200 : 0;
    const lwf = employee.lwfApplicable ? 25 : 0;
    
    const bonus = includeBonus && employee.bonusApplicable 
      ? Math.round(basicSalary * (bonusPercentage / 100)) : 0;
    
    const totalDeductions = epfEmployee + esicEmployee + professionalTax + lwf;
    const netSalary = grossSalary + bonus - totalDeductions;
    
    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeId || `EMP${employee.id}`,
      department: getDepartmentName(employee.departmentId),
      monthlyCTC,
      daysWorked,
      daysAbsent: absentDays,
      daysLeave: leaveDays,
      totalWorkingDays,
      grossSalary: Math.round(grossSalary),
      basicSalary: Math.round(basicSalary),
      hra: Math.round(hra),
      da: Math.round(da),
      specialAllowance: Math.round(specialAllowance),
      otherAllowances: Math.round(otherAllowances),
      epfEmployee,
      epfEmployer,
      esicEmployee,
      esicEmployer,
      professionalTax,
      lwf,
      bonus,
      totalDeductions,
      netSalary: Math.round(netSalary),
      attendanceData
    };
  };

  const runPayrollTest = async () => {
    setTestRunning(true);
    setTestCompleted(false);
    setTestResults([]);
    
    const { start, end } = getDateRange();
    const results: PayrollTestResult[] = [];
    
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      if (!employee.isActive || employee.status !== "active") continue;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const attendanceData = generateTestAttendance(employee.id, start, end);
      const payrollResult = calculatePayroll(employee, attendanceData);
      results.push(payrollResult);
    }
    
    setTestResults(results);
    setTestRunning(false);
    setTestCompleted(true);
    
    toast({
      title: "Test Run Completed",
      description: `Payroll calculated for ${results.length} employees`,
    });
  };

  const summary: TestRunSummary = useMemo(() => {
    if (testResults.length === 0) {
      return {
        totalEmployees: 0,
        totalGrossSalary: 0,
        totalNetSalary: 0,
        totalEPFEmployee: 0,
        totalEPFEmployer: 0,
        totalESICEmployee: 0,
        totalESICEmployer: 0,
        totalPT: 0,
        totalLWF: 0,
        totalBonus: 0,
        totalDeductions: 0
      };
    }
    
    return testResults.reduce((acc, result) => ({
      totalEmployees: acc.totalEmployees + 1,
      totalGrossSalary: acc.totalGrossSalary + result.grossSalary,
      totalNetSalary: acc.totalNetSalary + result.netSalary,
      totalEPFEmployee: acc.totalEPFEmployee + result.epfEmployee,
      totalEPFEmployer: acc.totalEPFEmployer + result.epfEmployer,
      totalESICEmployee: acc.totalESICEmployee + result.esicEmployee,
      totalESICEmployer: acc.totalESICEmployer + result.esicEmployer,
      totalPT: acc.totalPT + result.professionalTax,
      totalLWF: acc.totalLWF + result.lwf,
      totalBonus: acc.totalBonus + result.bonus,
      totalDeductions: acc.totalDeductions + result.totalDeductions
    }), {
      totalEmployees: 0,
      totalGrossSalary: 0,
      totalNetSalary: 0,
      totalEPFEmployee: 0,
      totalEPFEmployer: 0,
      totalESICEmployee: 0,
      totalESICEmployer: 0,
      totalPT: 0,
      totalLWF: 0,
      totalBonus: 0,
      totalDeductions: 0
    });
  }, [testResults]);

  const exportMusterRollPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const { start, end } = getDateRange();
    
    doc.setFontSize(14);
    doc.text("TEST RUN - Muster Roll Report", doc.internal.pageSize.width / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Period: ${format(start, "dd/MM/yyyy")} to ${format(end, "dd/MM/yyyy")}`, doc.internal.pageSize.width / 2, 22, { align: "center" });
    
    const tableData = testResults.map((result, index) => {
      const presentDays = result.attendanceData.filter(d => d.status === "present").length;
      const halfDays = result.attendanceData.filter(d => d.status === "halfday").length;
      const leaveDays = result.attendanceData.filter(d => d.status === "leave").length;
      const absentDays = result.attendanceData.filter(d => d.status === "absent").length;
      
      return [
        index + 1,
        result.employeeCode,
        result.employeeName,
        result.department,
        presentDays,
        halfDays,
        leaveDays,
        absentDays,
        result.daysWorked,
        result.grossSalary,
        result.epfEmployee,
        result.esicEmployee,
        result.professionalTax,
        result.totalDeductions,
        result.netSalary
      ];
    });
    
    autoTable(doc, {
      startY: 28,
      head: [[
        "Sr", "Code", "Name", "Dept", "P", "HD", "L", "A", "Worked", 
        "Gross", "EPF", "ESI", "PT", "Ded", "Net"
      ]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
    });
    
    doc.save(`Test_Muster_Roll_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
  };

  const exportMusterRollExcel = () => {
    const { start, end } = getDateRange();
    
    const headerRows = [
      ["TEST RUN - Muster Roll Report"],
      [`Period: ${format(start, "dd/MM/yyyy")} to ${format(end, "dd/MM/yyyy")}`],
      [""],
    ];
    
    const tableHeader = [
      "Sr No", "Employee Code", "Employee Name", "Department", "Present Days", 
      "Half Days", "Leave Days", "Absent Days", "Days Worked", "Gross Salary",
      "EPF (Employee)", "EPF (Employer)", "ESI (Employee)", "ESI (Employer)",
      "Professional Tax", "LWF", "Bonus", "Total Deductions", "Net Salary"
    ];
    
    const dataRows = testResults.map((result, index) => {
      const presentDays = result.attendanceData.filter(d => d.status === "present").length;
      const halfDays = result.attendanceData.filter(d => d.status === "halfday").length;
      const leaveDays = result.attendanceData.filter(d => d.status === "leave").length;
      const absentDays = result.attendanceData.filter(d => d.status === "absent").length;
      
      return [
        index + 1,
        result.employeeCode,
        result.employeeName,
        result.department,
        presentDays,
        halfDays,
        leaveDays,
        absentDays,
        result.daysWorked,
        result.grossSalary,
        result.epfEmployee,
        result.epfEmployer,
        result.esicEmployee,
        result.esicEmployer,
        result.professionalTax,
        result.lwf,
        result.bonus,
        result.totalDeductions,
        result.netSalary
      ];
    });
    
    const summaryRows = [
      [""],
      ["TOTALS", "", "", "", "", "", "", "", "",
        summary.totalGrossSalary,
        summary.totalEPFEmployee,
        summary.totalEPFEmployer,
        summary.totalESICEmployee,
        summary.totalESICEmployer,
        summary.totalPT,
        summary.totalLWF,
        summary.totalBonus,
        summary.totalDeductions,
        summary.totalNetSalary
      ]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, tableHeader, ...dataRows, ...summaryRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Muster Roll");
    XLSX.writeFile(wb, `Test_Muster_Roll_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const exportLeaveRegisterPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const { start, end } = getDateRange();
    
    doc.setFontSize(14);
    doc.text("TEST RUN - Leave Register Report", doc.internal.pageSize.width / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Period: ${format(start, "dd/MM/yyyy")} to ${format(end, "dd/MM/yyyy")}`, doc.internal.pageSize.width / 2, 22, { align: "center" });
    
    const tableData = testResults.map((result, index) => {
      const leaveDays = result.attendanceData.filter(d => d.status === "leave").length;
      const halfDays = result.attendanceData.filter(d => d.status === "halfday").length;
      
      return [
        index + 1,
        result.employeeCode,
        result.employeeName,
        result.department,
        result.totalWorkingDays,
        result.daysWorked,
        leaveDays,
        halfDays,
        0,
        leaveDays,
        result.grossSalary / result.totalWorkingDays,
        leaveDays * (result.grossSalary / result.totalWorkingDays)
      ];
    });
    
    autoTable(doc, {
      startY: 28,
      head: [[
        "Sr", "Code", "Name", "Dept", "Working Days", "Days Worked", 
        "Leave Taken", "Half Days", "Leave Balance", "Leave Earned", "Daily Rate", "Leave Wages"
      ]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [0, 102, 204], textColor: 255 },
    });
    
    doc.save(`Test_Leave_Register_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
  };

  const exportStatutoryReport = () => {
    const { start, end } = getDateRange();
    
    const headerRows = [
      ["TEST RUN - Statutory Compliance Report (PF, ESI, PT, LWF)"],
      [`Period: ${format(start, "dd/MM/yyyy")} to ${format(end, "dd/MM/yyyy")}`],
      [""],
    ];
    
    const pfHeader = ["PF CONTRIBUTIONS"];
    const pfTableHeader = ["Sr", "Employee Code", "Name", "Basic Salary", "Employee PF (12%)", "Employer PF (13%)", "Total PF"];
    const pfData = testResults.filter(r => r.epfEmployee > 0).map((result, index) => [
      index + 1,
      result.employeeCode,
      result.employeeName,
      result.basicSalary,
      result.epfEmployee,
      result.epfEmployer,
      result.epfEmployee + result.epfEmployer
    ]);
    
    const esiHeader = ["", "ESI CONTRIBUTIONS"];
    const esiTableHeader = ["Sr", "Employee Code", "Name", "Gross Salary", "Employee ESI (0.75%)", "Employer ESI (3.25%)", "Total ESI"];
    const esiData = testResults.filter(r => r.esicEmployee > 0).map((result, index) => [
      index + 1,
      result.employeeCode,
      result.employeeName,
      result.grossSalary,
      result.esicEmployee,
      result.esicEmployer,
      result.esicEmployee + result.esicEmployer
    ]);
    
    const ptHeader = ["", "PROFESSIONAL TAX"];
    const ptTableHeader = ["Sr", "Employee Code", "Name", "Gross Salary", "PT Amount"];
    const ptData = testResults.filter(r => r.professionalTax > 0).map((result, index) => [
      index + 1,
      result.employeeCode,
      result.employeeName,
      result.grossSalary,
      result.professionalTax
    ]);
    
    const summaryHeader = ["", "SUMMARY"];
    const summaryData = [
      ["Total EPF (Employee)", summary.totalEPFEmployee],
      ["Total EPF (Employer)", summary.totalEPFEmployer],
      ["Total ESI (Employee)", summary.totalESICEmployee],
      ["Total ESI (Employer)", summary.totalESICEmployer],
      ["Total Professional Tax", summary.totalPT],
      ["Total LWF", summary.totalLWF],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([
      ...headerRows,
      pfHeader, pfTableHeader, ...pfData, [""],
      esiHeader, esiTableHeader, ...esiData, [""],
      ptHeader, ptTableHeader, ...ptData, [""],
      summaryHeader, ...summaryData
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statutory Report");
    XLSX.writeFile(wb, `Test_Statutory_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const { start, end } = getDateRange();
  const periodDays = differenceInDays(end, start) + 1;

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Payroll Test Run</h1>
              <p className="text-muted-foreground">
                Simulate payroll processing to test calculations for ESI, PF, Bonus, and generate reports
              </p>
            </div>
            {testCompleted && (
              <Badge variant="default" className="bg-green-600 text-white">
                <CheckCircle className="h-4 w-4 mr-1" />
                Test Completed
              </Badge>
            )}
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Test Configuration
              </CardTitle>
              <CardDescription>
                Configure the date range and options for payroll test run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                    <SelectTrigger data-testid="select-date-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last15">Last 15 Days</SelectItem>
                      <SelectItem value="last30">Last 30 Days</SelectItem>
                      <SelectItem value="current_month">Current Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dateRange === "custom" && (
                  <>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        data-testid="input-end-date"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Period</Label>
                  <div className="h-9 flex items-center px-3 bg-muted rounded-md">
                    <span className="text-sm font-medium">
                      {format(start, "dd MMM")} - {format(end, "dd MMM yyyy")} ({periodDays} days)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeBonus" 
                    checked={includeBonus}
                    onCheckedChange={(checked) => setIncludeBonus(checked as boolean)}
                    data-testid="checkbox-include-bonus"
                  />
                  <Label htmlFor="includeBonus">Include Bonus Calculation</Label>
                </div>

                {includeBonus && (
                  <div className="space-y-2">
                    <Label>Bonus Percentage</Label>
                    <Input
                      type="number"
                      value={bonusPercentage}
                      onChange={(e) => setBonusPercentage(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      max="100"
                      data-testid="input-bonus-percentage"
                    />
                  </div>
                )}

                <div className="flex items-end">
                  <Button 
                    onClick={runPayrollTest} 
                    disabled={testRunning || employees.length === 0}
                    className="w-full"
                    data-testid="button-run-test"
                  >
                    {testRunning ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Payroll Test
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {testRunning && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing employees...</span>
                    <span>{testResults.length} / {employees.filter(e => e.isActive && e.status === "active").length}</span>
                  </div>
                  <Progress value={(testResults.length / employees.filter(e => e.isActive && e.status === "active").length) * 100} />
                </div>
              )}
            </CardContent>
          </Card>

          {testCompleted && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Employees</p>
                          <p className="text-2xl font-bold">{summary.totalEmployees}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Gross Salary</p>
                          <p className="text-2xl font-bold">₹{summary.totalGrossSalary.toLocaleString()}</p>
                        </div>
                        <IndianRupee className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Net Salary</p>
                          <p className="text-2xl font-bold">₹{summary.totalNetSalary.toLocaleString()}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Deductions</p>
                          <p className="text-2xl font-bold">₹{summary.totalDeductions.toLocaleString()}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Statutory Contributions Summary</CardTitle>
                      <Button variant="outline" size="sm" onClick={exportStatutoryReport} data-testid="button-export-statutory">
                        <Download className="h-4 w-4 mr-2" />
                        Export Statutory Report
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-xs text-muted-foreground">EPF (Employee)</p>
                        <p className="text-lg font-bold text-blue-600">₹{summary.totalEPFEmployee.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-xs text-muted-foreground">EPF (Employer)</p>
                        <p className="text-lg font-bold text-blue-600">₹{summary.totalEPFEmployer.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-xs text-muted-foreground">ESI (Employee)</p>
                        <p className="text-lg font-bold text-green-600">₹{summary.totalESICEmployee.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-xs text-muted-foreground">ESI (Employer)</p>
                        <p className="text-lg font-bold text-green-600">₹{summary.totalESICEmployer.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <p className="text-xs text-muted-foreground">Professional Tax</p>
                        <p className="text-lg font-bold text-purple-600">₹{summary.totalPT.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <p className="text-xs text-muted-foreground">Bonus</p>
                        <p className="text-lg font-bold text-orange-600">₹{summary.totalBonus.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="overview">Payroll Overview</TabsTrigger>
                    <TabsTrigger value="muster">Muster Roll</TabsTrigger>
                    <TabsTrigger value="leave">Leave Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Employee Payroll Details</CardTitle>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportMusterRollPDF} data-testid="button-export-pdf">
                              <FileText className="h-4 w-4 mr-2" />
                              PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportMusterRollExcel} data-testid="button-export-excel">
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Excel
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <Table className="text-sm">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">Sr</TableHead>
                              <TableHead>Employee</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead className="text-right">CTC</TableHead>
                              <TableHead className="text-center">Days</TableHead>
                              <TableHead className="text-right">Gross</TableHead>
                              <TableHead className="text-right">EPF</TableHead>
                              <TableHead className="text-right">ESI</TableHead>
                              <TableHead className="text-right">PT</TableHead>
                              <TableHead className="text-right">Bonus</TableHead>
                              <TableHead className="text-right">Net</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {testResults.map((result, index) => (
                              <TableRow key={result.employeeId} data-testid={`row-employee-${result.employeeId}`}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                  <div>
                                    <p>{result.employeeName}</p>
                                    <p className="text-xs text-muted-foreground">{result.employeeCode}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{result.department}</TableCell>
                                <TableCell className="text-right">₹{result.monthlyCTC.toLocaleString()}</TableCell>
                                <TableCell className="text-center">{result.daysWorked}</TableCell>
                                <TableCell className="text-right">₹{result.grossSalary.toLocaleString()}</TableCell>
                                <TableCell className="text-right">₹{result.epfEmployee.toLocaleString()}</TableCell>
                                <TableCell className="text-right">₹{result.esicEmployee.toLocaleString()}</TableCell>
                                <TableCell className="text-right">₹{result.professionalTax.toLocaleString()}</TableCell>
                                <TableCell className="text-right">₹{result.bonus.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-bold">₹{result.netSalary.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="muster" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Muster Roll Report</CardTitle>
                            <CardDescription>Daily attendance and wage register</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportMusterRollPDF} data-testid="button-muster-pdf">
                              <FileText className="h-4 w-4 mr-2" />
                              PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportMusterRollExcel} data-testid="button-muster-excel">
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Excel
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8">Sr</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead className="text-center">P</TableHead>
                              <TableHead className="text-center">HD</TableHead>
                              <TableHead className="text-center">L</TableHead>
                              <TableHead className="text-center">A</TableHead>
                              <TableHead className="text-center">Worked</TableHead>
                              <TableHead className="text-right">Basic</TableHead>
                              <TableHead className="text-right">HRA</TableHead>
                              <TableHead className="text-right">Gross</TableHead>
                              <TableHead className="text-right">PF</TableHead>
                              <TableHead className="text-right">ESI</TableHead>
                              <TableHead className="text-right">Net</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {testResults.map((result, index) => {
                              const presentDays = result.attendanceData.filter(d => d.status === "present").length;
                              const halfDays = result.attendanceData.filter(d => d.status === "halfday").length;
                              const leaveDays = result.attendanceData.filter(d => d.status === "leave").length;
                              const absentDays = result.attendanceData.filter(d => d.status === "absent").length;
                              
                              return (
                                <TableRow key={result.employeeId}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell className="font-medium">{result.employeeName}</TableCell>
                                  <TableCell className="text-center text-green-600">{presentDays}</TableCell>
                                  <TableCell className="text-center text-yellow-600">{halfDays}</TableCell>
                                  <TableCell className="text-center text-blue-600">{leaveDays}</TableCell>
                                  <TableCell className="text-center text-red-600">{absentDays}</TableCell>
                                  <TableCell className="text-center font-medium">{result.daysWorked}</TableCell>
                                  <TableCell className="text-right">{result.basicSalary}</TableCell>
                                  <TableCell className="text-right">{result.hra}</TableCell>
                                  <TableCell className="text-right">{result.grossSalary}</TableCell>
                                  <TableCell className="text-right">{result.epfEmployee}</TableCell>
                                  <TableCell className="text-right">{result.esicEmployee}</TableCell>
                                  <TableCell className="text-right font-bold">{result.netSalary}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="leave" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Leave Register Report</CardTitle>
                            <CardDescription>Leave with wages register</CardDescription>
                          </div>
                          <Button variant="outline" size="sm" onClick={exportLeaveRegisterPDF} data-testid="button-leave-pdf">
                            <FileText className="h-4 w-4 mr-2" />
                            Export PDF
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <Table className="text-sm">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">Sr</TableHead>
                              <TableHead>Employee</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead className="text-center">Working Days</TableHead>
                              <TableHead className="text-center">Days Worked</TableHead>
                              <TableHead className="text-center">Leave Taken</TableHead>
                              <TableHead className="text-center">Half Days</TableHead>
                              <TableHead className="text-center">Absent</TableHead>
                              <TableHead className="text-right">Daily Rate</TableHead>
                              <TableHead className="text-right">Leave Wages</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {testResults.map((result, index) => {
                              const leaveDays = result.attendanceData.filter(d => d.status === "leave").length;
                              const halfDays = result.attendanceData.filter(d => d.status === "halfday").length;
                              const absentDays = result.attendanceData.filter(d => d.status === "absent").length;
                              const dailyRate = Math.round(result.grossSalary / result.daysWorked) || 0;
                              
                              return (
                                <TableRow key={result.employeeId}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell className="font-medium">{result.employeeName}</TableCell>
                                  <TableCell>{result.department}</TableCell>
                                  <TableCell className="text-center">{result.totalWorkingDays}</TableCell>
                                  <TableCell className="text-center">{result.daysWorked}</TableCell>
                                  <TableCell className="text-center text-blue-600">{leaveDays}</TableCell>
                                  <TableCell className="text-center text-yellow-600">{halfDays}</TableCell>
                                  <TableCell className="text-center text-red-600">{absentDays}</TableCell>
                                  <TableCell className="text-right">₹{dailyRate}</TableCell>
                                  <TableCell className="text-right">₹{leaveDays * dailyRate}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
