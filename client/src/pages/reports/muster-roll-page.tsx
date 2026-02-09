import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
  position: string;
  departmentId: number;
  dateOfBirth?: string;
  gender?: string;
  joinDate?: string;
  basicSalary?: number;
  hra?: number;
  salary?: number;
}

interface Attendance {
  id: number;
  userId: number;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  hoursWorked?: number;
}

interface PayrollRecord {
  id: number;
  userId: number;
  month: number;
  year: number;
  basicSalary: number;
  hra?: number;
  allowances?: number;
  deductions?: number;
  pfContribution?: number;
  esiContribution?: number;
  netSalary: number;
  status: string;
}

export default function MusterRollPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [establishmentName, setEstablishmentName] = useState("ASN HR Consultancy & Services");
  const [employerName, setEmployerName] = useState("ASN HR Consultancy");
  const [viewType, setViewType] = useState<"muster" | "wage">("muster");

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: payrollRecords = [] } = useQuery<PayrollRecord[]>({
    queryKey: ["/api/payroll"],
  });

  const getPayrollForEmployee = (employeeId: number): PayrollRecord | undefined => {
    return payrollRecords.find(
      p => p.userId === employeeId && p.month === selectedMonth && p.year === selectedYear
    );
  };

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);

  const getAttendanceForDay = (employeeId: number, day: number): string => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = attendanceRecords.find(
      (a) => a.userId === employeeId && a.date === dateStr
    );
    if (!record) return "-";
    switch (record.status) {
      case "present": return "P";
      case "absent": return "A";
      case "half-day": return "H";
      case "leave": return "L";
      case "holiday": return "HO";
      case "weekly-off": return "WO";
      default: return "-";
    }
  };

  const getHoursWorkedForDay = (employeeId: number, day: number): number => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = attendanceRecords.find(
      (a) => a.userId === employeeId && a.date === dateStr
    );
    return record?.hoursWorked || 0;
  };

  const calculateEmployeeData = (employee: Employee) => {
    let totalDaysWorked = 0;
    let totalHoursWorked = 0;
    let overtimeHours = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const status = getAttendanceForDay(employee.id, day);
      if (status === "P") {
        totalDaysWorked++;
        const hours = getHoursWorkedForDay(employee.id, day);
        totalHoursWorked += hours;
        if (hours > 8) overtimeHours += hours - 8;
      } else if (status === "H") {
        totalDaysWorked += 0.5;
        totalHoursWorked += 4;
      }
    }

    const payrollData = getPayrollForEmployee(employee.id);
    const basicSalary = payrollData?.basicSalary || employee.basicSalary || employee.salary || 15000;
    const hra = payrollData?.hra || employee.hra || Math.round(basicSalary * 0.4);
    const dailyRate = basicSalary / 26;
    const hourlyRate = dailyRate / 8;
    const normalWages = Math.round(dailyRate * totalDaysWorked);
    const hraPayable = Math.round((hra / 26) * totalDaysWorked);
    const overtimePayable = Math.round(overtimeHours * hourlyRate * 2);
    const allowances = payrollData?.allowances || 0;
    const grossWages = normalWages + hraPayable + overtimePayable + allowances;
    const pfDeduction = payrollData?.pfContribution || Math.round(basicSalary * 0.12);
    const esiDeduction = payrollData?.esiContribution || (grossWages <= 21000 ? Math.round(grossWages * 0.0075) : 0);
    const otherDeductions = payrollData?.deductions || 0;
    const totalDeductions = pfDeduction + esiDeduction + otherDeductions;
    const netWages = payrollData?.netSalary || (grossWages - totalDeductions);

    return {
      totalDaysWorked,
      totalHoursWorked,
      overtimeHours,
      dailyRate: Math.round(dailyRate),
      basicSalary,
      normalWages,
      hraPayable,
      overtimePayable,
      allowances,
      grossWages,
      pfDeduction,
      esiDeduction,
      otherDeductions,
      totalDeductions,
      netWages
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const monthName = months.find(m => m.value === selectedMonth)?.label || "";
    
    doc.setFontSize(14);
    doc.text(viewType === "muster" ? "Form II - Muster Roll" : "Form II - Wage Register", doc.internal.pageSize.width / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("[See Rule 27(1)]", doc.internal.pageSize.width / 2, 21, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Name of the Establishment: ${establishmentName}`, 14, 30);
    doc.text(`Name of the Employer: ${employerName}`, 14, 36);
    doc.text(`For the month of: ${monthName} ${selectedYear}`, doc.internal.pageSize.width - 14, 30, { align: "right" });

    const dayHeaders = Array.from({ length: viewType === "muster" ? Math.min(daysInMonth, 15) : daysInMonth }, (_, i) => String(i + 1));
    
    const tableData = employees.map((emp, index) => {
      const data = calculateEmployeeData(emp);
      const dob = emp.dateOfBirth ? new Date(emp.dateOfBirth) : null;
      const age = dob ? Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "-";
      const attendanceMarks = dayHeaders.map(day => getAttendanceForDay(emp.id, Number(day)));
      
      if (viewType === "muster") {
        return [
          index + 1,
          `${emp.firstName} ${emp.lastName}`,
          `${age}/${emp.gender?.[0] || "M"}`,
          emp.position || "-",
          ...attendanceMarks,
          data.totalDaysWorked
        ];
      } else {
        return [
          index + 1,
          `${emp.firstName} ${emp.lastName}`,
          `${age}/${emp.gender?.[0] || "M"}`,
          emp.position || "-",
          ...attendanceMarks,
          data.totalDaysWorked,
          data.basicSalary,
          data.normalWages,
          data.hraPayable,
          data.pfDeduction,
          data.esiDeduction,
          data.grossWages,
          data.totalDeductions,
          data.netWages
        ];
      }
    });

    const head = viewType === "muster" 
      ? [["Sl", "Name", "Age/Sex", "Designation", ...dayHeaders, "Days"]]
      : [["Sl", "Name", "Age/Sex", "Designation", ...dayHeaders, "Days", "Basic", "Wages", "HRA", "PF", "ESI", "Gross", "Ded.", "Net"]];

    autoTable(doc, {
      startY: 42,
      head: head,
      body: tableData,
      theme: "grid",
      styles: { fontSize: viewType === "muster" ? 7 : 5, cellPadding: 1 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 150;
    doc.setFontSize(8);
    doc.text("Signature of Employer: ________________________", 14, finalY + 15);
    doc.text("Date: ________________________", doc.internal.pageSize.width - 60, finalY + 15);

    doc.save(`Muster_Roll_Form_II_${monthName}_${selectedYear}.pdf`);
  };

  const exportToExcel = () => {
    const headerRows = [
      ["Form II - Muster Roll cum Wage Register"],
      ["[See Rule 27(1)]"],
      [""],
      [`Name of the Establishment: ${establishmentName}`],
      [`Name of the Employer: ${employerName}`],
      [`For the month of: ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`],
      [""]
    ];

    const dayColumns = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const tableHeader = [
      "Sl No", "Full name of the employee", "Age and sex", "Nature of work and designation",
      "Date of entry into service", "Working hours From", "Working hours To", "Intervals From", "Intervals To",
      ...dayColumns,
      "Total days worked", "Minimum rates of wages payable", "Actual rates of wages payable",
      "Overtime hours worked", "Normal wages", "HRA", "Overtime Payable", "Gross wages payable",
      "Deduction - Advances", "Deduction - Fines", "Deduction - Damages", "Net wages paid",
      "Leave Earned Previous Balance", "Leave Availed during the month", "Leave Balance at the end of the month",
      "Date of payment of wages", "Signature/thumb impression of the employee"
    ];

    const dataRows = employees.map((emp, index) => {
      const data = calculateEmployeeData(emp);
      const dob = emp.dateOfBirth ? new Date(emp.dateOfBirth) : null;
      const age = dob ? Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "-";
      const attendanceMarks = dayColumns.map(day => getAttendanceForDay(emp.id, day));

      return [
        index + 1,
        `${emp.firstName} ${emp.lastName}`,
        `${age}/${emp.gender || "M"}`,
        emp.position || "Worker",
        emp.joinDate || "-",
        "09:00",
        "18:00",
        "13:00",
        "14:00",
        ...attendanceMarks,
        data.totalDaysWorked,
        data.dailyRate,
        data.dailyRate,
        data.overtimeHours,
        data.normalWages,
        data.hraPayable,
        data.overtimePayable,
        data.grossWages,
        0,
        0,
        0,
        data.netWages,
        0,
        0,
        0,
        `${daysInMonth}/${selectedMonth}/${selectedYear}`,
        ""
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([...headerRows, tableHeader, ...dataRows]);
    
    ws["!cols"] = [
      { wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 12 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      ...Array(daysInMonth).fill({ wch: 4 }),
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Muster Roll Form II");
    XLSX.writeFile(wb, `Muster_Roll_Form_II_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`);
  };

  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const downloadTemplate = () => {
    const dayColumns = Array.from({ length: 31 }, (_, i) => i + 1);
    const templateHeader = [
      ["Form II - Muster Roll cum Wage Register - IMPORT TEMPLATE"],
      ["Instructions: Fill the data below and import. Attendance codes: P=Present, A=Absent, L=Leave, H=Half-day, WO=Weekly Off, HO=Holiday"],
      [""],
      ["Name of the Establishment:", ""],
      ["Name of the Employer:", ""],
      ["For the month of:", ""],
      [""]
    ];

    const tableHeader = [
      "Employee ID", "Full Name", "Age", "Gender (M/F)", "Designation", "Date of Joining (DD/MM/YYYY)",
      "Working Hours From", "Working Hours To", "Interval From", "Interval To",
      ...dayColumns.map(d => `Day ${d}`),
      "Basic Salary", "HRA", "Overtime Hours", "Advances", "Fines", "Damages"
    ];

    const sampleRow = [
      "EMP001", "John Doe", "30", "M", "Worker", "01/01/2024",
      "09:00", "18:00", "13:00", "14:00",
      ...Array(31).fill("P"),
      "15000", "5000", "0", "0", "0", "0"
    ];

    const ws = XLSX.utils.aoa_to_sheet([...templateHeader, tableHeader, sampleRow, []]);
    ws["!cols"] = [
      { wch: 12 }, { wch: 20 }, { wch: 6 }, { wch: 10 }, { wch: 15 }, { wch: 18 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      ...Array(31).fill({ wch: 5 }),
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Muster Roll Template");
    XLSX.writeFile(wb, "Muster_Roll_Form_II_Template.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const response = await apiRequest("POST", "/api/attendance/bulk", {
          records: data.map((row: any) => ({
            ...row,
            month: selectedMonth,
            year: selectedYear
          }))
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
          toast({
            title: "Import Successful",
            description: `Successfully synced records from ${file.name}`,
          });
        } else {
          throw new Error("Failed to sync data");
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Could not parse or sync the file. Please use the provided template.",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Muster Roll - Form II</h1>
            <p className="text-muted-foreground">Maharashtra Factories Rules - Muster Roll cum Wage Register</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <input
                type="file"
                className="hidden"
                id="muster-roll-import"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
              />
              <Button variant="outline" onClick={() => document.getElementById('muster-roll-import')?.click()} data-testid="button-import">
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
            <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={exportToPDF} data-testid="button-export-pdf">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={exportToExcel} data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Settings</CardTitle>
              <Tabs value={viewType} onValueChange={(v) => setViewType(v as "muster" | "wage")} className="w-auto">
                <TabsList className="grid w-64 grid-cols-2">
                  <TabsTrigger value="muster">Muster Roll</TabsTrigger>
                  <TabsTrigger value="wage">Wage Register</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Establishment Name</Label>
                <Input 
                  value={establishmentName} 
                  onChange={(e) => setEstablishmentName(e.target.value)}
                  data-testid="input-establishment-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Employer Name</Label>
                <Input 
                  value={employerName} 
                  onChange={(e) => setEmployerName(e.target.value)}
                  data-testid="input-employer-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none">
          <CardHeader className="print:pb-2">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{viewType === "muster" ? "Form II - Muster Roll" : "Form II - Wage Register"}</p>
              <p className="text-xs text-muted-foreground">[See Rule 27(1)]</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p><strong>Name of the Establishment:</strong> {establishmentName}</p>
                <p><strong>Name of the Employer:</strong> {employerName}</p>
              </div>
              <div className="text-right">
                <p><strong>For the month of:</strong> {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-10" rowSpan={2}>Sl No</TableHead>
                  <TableHead className="min-w-[150px]" rowSpan={2}>Full name of employee</TableHead>
                  <TableHead className="text-center w-16" rowSpan={2}>Age/Sex</TableHead>
                  <TableHead className="min-w-[100px]" rowSpan={2}>Designation</TableHead>
                  {viewType === "muster" ? (
                    <>
                      <TableHead className="text-center" colSpan={daysInMonth}>Attendance</TableHead>
                      <TableHead className="text-center w-12" rowSpan={2}>Days</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-center" colSpan={15}>Attendance (1-15)</TableHead>
                      <TableHead className="text-center w-12" rowSpan={2}>Days</TableHead>
                      <TableHead className="text-center w-16" rowSpan={2}>Basic Wages</TableHead>
                      <TableHead className="text-center w-14" rowSpan={2}>HRA</TableHead>
                      <TableHead className="text-center w-14" rowSpan={2}>PF</TableHead>
                      <TableHead className="text-center w-14" rowSpan={2}>ESI</TableHead>
                      <TableHead className="text-center w-16" rowSpan={2}>Gross</TableHead>
                      <TableHead className="text-center w-14" rowSpan={2}>Ded.</TableHead>
                      <TableHead className="text-center w-16" rowSpan={2}>Net</TableHead>
                    </>
                  )}
                </TableRow>
                <TableRow>
                  {Array.from({ length: viewType === "muster" ? daysInMonth : 15 }, (_, i) => (
                    <TableHead key={i} className="text-center w-8 p-1">{i + 1}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={viewType === "muster" ? 5 + daysInMonth : 14 + 15} className="text-center py-8 text-muted-foreground">
                      No employees found. Add employees to generate report.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp, index) => {
                    const data = calculateEmployeeData(emp);
                    const dob = emp.dateOfBirth ? new Date(emp.dateOfBirth) : null;
                    const age = dob ? Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "-";

                    return (
                      <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                        <TableCell className="text-center">{age}/{emp.gender?.[0] || "M"}</TableCell>
                        <TableCell>{emp.position || "-"}</TableCell>
                        {viewType === "muster" ? (
                          <>
                            {Array.from({ length: daysInMonth }, (_, i) => (
                              <TableCell key={i} className="text-center p-1">
                                {getAttendanceForDay(emp.id, i + 1)}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-medium">{data.totalDaysWorked}</TableCell>
                          </>
                        ) : (
                          <>
                            {Array.from({ length: 15 }, (_, i) => (
                              <TableCell key={i} className="text-center p-1">
                                {getAttendanceForDay(emp.id, i + 1)}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-medium">{data.totalDaysWorked}</TableCell>
                            <TableCell className="text-center">{data.basicSalary}</TableCell>
                            <TableCell className="text-center">{data.hraPayable}</TableCell>
                            <TableCell className="text-center">{data.pfDeduction}</TableCell>
                            <TableCell className="text-center">{data.esiDeduction}</TableCell>
                            <TableCell className="text-center font-medium">{data.grossWages}</TableCell>
                            <TableCell className="text-center">{data.totalDeductions}</TableCell>
                            <TableCell className="text-center font-medium text-teal-600">{data.netWages}</TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="print:block hidden text-sm mt-8">
            <div className="flex justify-between">
              <div>
                <p>Signature of the Authorised Representative:</p>
                <p>Principal Employer (In the case of Contract Labour):</p>
              </div>
              <div className="text-right">
                <p>Signature of the Employer or the person authorised</p>
                <p>by him to authenticate the above entries with the company seal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
