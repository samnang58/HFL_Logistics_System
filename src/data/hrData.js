export const HR_STATS = [
  { label: "Total Employees", value: "248", change: "12%", direction: "up", iconBg: "bg-blue-500" },
  { label: "Present Today", value: "212", change: null, note: "85% On duty now", iconBg: "bg-emerald-500" },
  { label: "On Leave", value: "18", change: null, note: "7% Today", iconBg: "bg-amber-500" },
  { label: "Absent Today", value: "10", change: "4%", direction: "down", note: "Today", iconBg: "bg-rose-500" },
  { label: "New Hires (This Month)", value: "6", change: "50%", direction: "up", iconBg: "bg-violet-500" },
  { label: "Total Departments", value: "12", change: null, note: "Active", iconBg: "bg-blue-500" },
];

export const ATTENDANCE_OVERVIEW = [
  { date: "Sep 1", present: 205, absent: 15, leave: 10 },
  { date: "Sep 5", present: 198, absent: 20, leave: 12 },
  { date: "Sep 10", present: 210, absent: 12, leave: 8 },
  { date: "Sep 15", present: 200, absent: 18, leave: 15 },
  { date: "Sep 20", present: 215, absent: 10, leave: 9 },
  { date: "Sep 25", present: 218, absent: 8, leave: 10 },
  { date: "Sep 30", present: 212, absent: 10, leave: 18 },
];

export const EMPLOYEE_DISTRIBUTION = [
  { label: "Operations", value: 72, percent: 29, color: "#2563eb" },
  { label: "Administration", value: 48, percent: 19, color: "#10b981" },
  { label: "Sales & Marketing", value: 36, percent: 15, color: "#f59e0b" },
  { label: "Warehouse", value: 32, percent: 13, color: "#f97316" },
  { label: "IT & Technical", value: 24, percent: 10, color: "#a855f7" },
  { label: "Finance & Accounting", value: 20, percent: 8, color: "#ec4899" },
  { label: "HR", value: 16, percent: 16, color: "#0ea5e9" },
];

export const LEAVE_SUMMARY = [
  { name: "Annual Leave", value: 124 },
  { name: "Sick Leave", value: 36 },
  { name: "Personal Leave", value: 28 },
  { name: "Maternity Leave", value: 12 },
  { name: "Unpaid Leave", value: 8 },
  { name: "Other Leave", value: 6 },
];

export const RECENT_EMPLOYEES = [
  { id: 1, empId: "HFL-EMP-001", name: "Sokha Men", dept: "Operations", position: "Warehouse Staff", joined: "Jan 10, 2025", status: "Active" },
  { id: 2, empId: "HFL-EMP-002", name: "Rithy Chan", dept: "Sales", position: "Sales Executive", joined: "Jan 15, 2025", status: "Active" },
  { id: 3, empId: "HFL-EMP-003", name: "Makara Chhun", dept: "IT", position: "IT Support", joined: "Feb 1, 2025", status: "Active" },
  { id: 4, empId: "HFL-EMP-004", name: "Sophea Lim", dept: "Administration", position: "Admin Officer", joined: "Feb 10, 2025", status: "Active" },
  { id: 5, empId: "HFL-EMP-005", name: "Dara Sok", dept: "Finance", position: "Accountant", joined: "Mar 1, 2025", status: "Active" },
];

export const UPCOMING_BIRTHDAYS = [
  { id: 1, name: "Rithy Chan", dept: "Sales", date: "Sep 12", inDays: "2 days" },
  { id: 2, name: "Sophea Lim", dept: "Administration", date: "Sep 15", inDays: "5 days" },
  { id: 3, name: "Vannak Proeun", dept: "Operations", date: "Sep 18", inDays: "8 days" },
  { id: 4, name: "Kanha Nget", dept: "Warehouse", date: "Sep 20", inDays: "10 days" },
  { id: 5, name: "Sothea Khem", dept: "IT", date: "Sep 25", inDays: "15 days" },
];

export const QUICK_ACTIONS = ["Add Employee", "Mark Attendance", "Apply Leave", "Process Payroll", "Recruitment", "Expense Claim", "Training", "Performance", "View Reports"];

export const DEPARTMENT_HEADCOUNT = [
  { name: "Operations", value: 72 },
  { name: "Administration", value: 48 },
  { name: "Sales & Marketing", value: 36 },
  { name: "Warehouse", value: 32 },
  { name: "IT", value: 24 },
  { name: "Finance", value: 20 },
  { name: "HR", value: 16 },
];

export const EMPLOYEE_TURNOVER = [
  { month: "Jan", rate: 6.5 },
  { month: "Feb", rate: 14 },
  { month: "Mar", rate: 9 },
  { month: "Apr", rate: 8 },
  { month: "May", rate: 5 },
  { month: "Jun", rate: 7 },
  { month: "Jul", rate: 8.2 },
  { month: "Aug", rate: 7.5 },
  { month: "Sep", rate: 9.5 },
];

export const ANNOUNCEMENTS = [
  { title: "Office Holiday Notice", desc: "Our office will be closed on Sep 16, 2025 (Pchum Ben Day).", date: "Sep 8, 2025" },
  { title: "New Employee Orientation", desc: "Welcome to all new team members! Orientation will be on Sep 12.", date: "Sep 5, 2025" },
  { title: "Health Check-up Program", desc: "Annual health check-up will be held from Sep 20-25, 2025.", date: "Sep 3, 2025" },
  { title: "Training Session", desc: "Logistics System Training for all operation staff.", date: "Sep 1, 2025" },
];
