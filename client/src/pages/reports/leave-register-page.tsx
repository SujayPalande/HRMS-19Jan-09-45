import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
  position: string;
  departmentId: number;
  joinDate?: string;
  basicSalary?: number;
}

interface Leave {
  id: number;
  userId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  reason?: string;
}

interface Attendance {
  id: number;
  userId: number;
  date: string;
  status: string;
  hoursWorked?: number;
}

export default function LeaveRegisterPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [factoryName, setFactoryName] = useState("ASN HR Consultancy & Services");
  const [departmentName, setDepartmentName] = useState("All Departments");

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaveRequests = [] } = useQuery<Leave[]>({
    queryKey: ["/api/leave-requests"],
  });

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance"],
  });

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const calculateLeaveData = (employee: Employee) => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);

    const yearAttendance = attendanceRecords.filter(a => {
      const date = new Date(a.date);
      return a.userId === employee.id && date >= yearStart && date <= yearEnd;
    });

    const daysWorked = yearAttendance.filter(a => a.status === "present").length;
    const layOffDays = yearAttendance.filter(a => a.status === "layoff").length;
    
    const employeeLeaves = leaveRequests.filter(l => {
      const start = new Date(l.startDate);
      return l.userId === employee.id && 
             l.status === "approved" && 
             start.getFullYear() === selectedYear;
    });

    const maternityLeave = employeeLeaves
      .filter(l => l.leaveType === "maternity")
      .reduce((sum, l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

    const leaveEnjoyed = employeeLeaves
      .filter(l => l.leaveType !== "maternity")
      .reduce((sum, l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

    const earnedLeave = Math.floor(daysWorked / 20);
    const previousBalance = 0;
    const totalLeave = earnedLeave + previousBalance;
    const balanceLeave = totalLeave - leaveEnjoyed;

    const basicSalary = employee.basicSalary || 15000;
    const dailyRate = Math.round(basicSalary / 26);
    const leaveWages = dailyRate * leaveEnjoyed;

    return {
      daysWorked,
      layOffDays,
      maternityLeave,
      leaveEnjoyed,
      totalDays: daysWorked + layOffDays + maternityLeave + leaveEnjoyed,
      previousBalance,
      earnedLeave,
      totalLeave,
      balanceLeave,
      dailyRate,
      leaveWages
    };
  };

  const exportToExcel = () => {
    const headerRows = [
      ["The Maharashtra Factories Rules"],
      ["FORM 20"],
      ["(See Rules 105 and 106)"],
      ["Register of leave with wages"],
      [""],
      [`Factory: ${factoryName}`],
      [`Department: ${departmentName}`],
      [`Calendar Year: ${selectedYear}`],
      ["Part I - Adults"],
      [""]
    ];

    const tableHeader = [
      "Sr. No.", "Sr. No. in Register", "Name", "Father's Name", "Date of entry into Service",
      "Calendar year of service", "Number of days of work performed", "Number of days lay-off",
      "Number of days of maternity leave with wages", "Number of leave with wages enjoyed",
      "Total (cols. 5 to 8)", "Balance of leave with wages from preceding year",
      "Leave with wages earned during the year", "Total of cols. 10 & 11",
      "Whether leave with wages refused", "Whether leave not desired during next calendar year",
      "Leave with wages enjoyed From", "Leave with wages enjoyed To", "Balance to credit",
      "Normal rate of wages", "Cash equivalent or advantage", "Rate of wages for leave with wages period",
      "Date of discharge", "Date of amount of payment made in lieu of leave with wages due", "Remarks"
    ];

    const dataRows = employees.map((emp, index) => {
      const data = calculateLeaveData(emp);
      const joinDate = emp.joinDate ? new Date(emp.joinDate) : null;
      const yearsOfService = joinDate ? selectedYear - joinDate.getFullYear() : 0;

      return [
        index + 1,
        emp.employeeId,
        `${emp.firstName} ${emp.lastName}`,
        "-",
        emp.joinDate || "-",
        yearsOfService,
        data.daysWorked,
        data.layOffDays,
        data.maternityLeave,
        data.leaveEnjoyed,
        data.totalDays,
        data.previousBalance,
        data.earnedLeave,
        data.totalLeave,
        "No",
        "No",
        "-",
        "-",
        data.balanceLeave,
        data.dailyRate,
        "-",
        data.dailyRate,
        "-",
        data.leaveWages > 0 ? data.leaveWages : "-",
        ""
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([...headerRows, tableHeader, ...dataRows]);
    
    ws["!cols"] = [
      { wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leave Register Form 20");
    XLSX.writeFile(wb, `Leave_Register_Form_20_${selectedYear}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Leave Register - Form 20</h1>
          <p className="text-muted-foreground">Maharashtra Factories Rules - Register of leave with wages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={exportToExcel} data-testid="button-export-excel">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Factory Name</Label>
              <Input 
                value={factoryName} 
                onChange={(e) => setFactoryName(e.target.value)}
                data-testid="input-factory-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input 
                value={departmentName} 
                onChange={(e) => setDepartmentName(e.target.value)}
                data-testid="input-department-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Calendar Year</Label>
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
            <p className="text-sm">The Maharashtra Factories Rules</p>
            <p className="text-lg font-bold">FORM 20</p>
            <p className="text-xs text-muted-foreground">(See Rules 105 and 106)</p>
            <p className="text-sm font-medium">Register of leave with wages</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p><strong>Factory:</strong> {factoryName}</p>
              <p><strong>Department:</strong> {departmentName}</p>
            </div>
            <div className="text-right">
              <p><strong>Part I - Adults</strong></p>
              <p><strong>Calendar Year:</strong> {selectedYear}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-10" rowSpan={2}>Sr. No.</TableHead>
                <TableHead className="text-center w-16" rowSpan={2}>Emp ID</TableHead>
                <TableHead className="min-w-[150px]" rowSpan={2}>Name</TableHead>
                <TableHead className="text-center w-20" rowSpan={2}>DOJ</TableHead>
                <TableHead className="text-center" colSpan={5}>Number of days during calendar year</TableHead>
                <TableHead className="text-center" colSpan={3}>Leave with wages to credit</TableHead>
                <TableHead className="text-center w-16" rowSpan={2}>Daily Rate</TableHead>
                <TableHead className="text-center w-16" rowSpan={2}>Leave Wages</TableHead>
                <TableHead className="text-center w-20" rowSpan={2}>Remarks</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-center w-14">Days Worked</TableHead>
                <TableHead className="text-center w-12">Lay-off</TableHead>
                <TableHead className="text-center w-14">Maternity</TableHead>
                <TableHead className="text-center w-12">Leave Enjoyed</TableHead>
                <TableHead className="text-center w-12">Total</TableHead>
                <TableHead className="text-center w-14">Previous Balance</TableHead>
                <TableHead className="text-center w-12">Earned</TableHead>
                <TableHead className="text-center w-12">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                    No employees found. Add employees to generate leave register.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp, index) => {
                  const data = calculateLeaveData(emp);

                  return (
                    <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="text-center">{emp.employeeId}</TableCell>
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell className="text-center">
                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : "-"}
                      </TableCell>
                      <TableCell className="text-center">{data.daysWorked}</TableCell>
                      <TableCell className="text-center">{data.layOffDays}</TableCell>
                      <TableCell className="text-center">{data.maternityLeave}</TableCell>
                      <TableCell className="text-center">{data.leaveEnjoyed}</TableCell>
                      <TableCell className="text-center font-medium">{data.totalDays}</TableCell>
                      <TableCell className="text-center">{data.previousBalance}</TableCell>
                      <TableCell className="text-center">{data.earnedLeave}</TableCell>
                      <TableCell className="text-center font-medium">{data.balanceLeave}</TableCell>
                      <TableCell className="text-center">{data.dailyRate}</TableCell>
                      <TableCell className="text-center">{data.leaveWages > 0 ? data.leaveWages : "-"}</TableCell>
                      <TableCell className="text-center">-</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground italic">
        Note: Separate page will be allotted to each worker as per Form 20 requirements. This consolidated view is for overview purposes.
      </div>
    </div>
  );
}
