import React from "react";
import {
  Users, UserCheck2, CalendarClock, UserX, UserPlus, Building2,
  UserPlus2, ClipboardCheck, CalendarCheck, Wallet, ClipboardList,
  Receipt, GraduationCap, LineChart as LineChartIcon, FileBarChart,
  Cake, Megaphone,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, Dropdown, ViewAllLink } from "../../components/ui/Card.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import DonutStat from "../../components/ui/DonutStat.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PageHero from "../../components/ui/PageHero.jsx";
import {
  HR_STATS, ATTENDANCE_OVERVIEW, EMPLOYEE_DISTRIBUTION, LEAVE_SUMMARY,
  RECENT_EMPLOYEES, UPCOMING_BIRTHDAYS, QUICK_ACTIONS, DEPARTMENT_HEADCOUNT,
  EMPLOYEE_TURNOVER, ANNOUNCEMENTS,
} from "../../data/hrData.js";

const STAT_ICONS = [Users, UserCheck2, CalendarClock, UserX, UserPlus, Building2];
const QUICK_ICONS = [UserPlus2, ClipboardCheck, CalendarCheck, Wallet, ClipboardList, Receipt, GraduationCap, LineChartIcon, FileBarChart];
const LEAVE_MAX = Math.max(...LEAVE_SUMMARY.map((l) => l.value));

const EMPLOYEE_COLUMNS = [
  { key: "empId", label: "Employee ID", type: "link" },
  { key: "name", label: "Name" },
  { key: "dept", label: "Department" },
  { key: "position", label: "Position" },
  { key: "joined", label: "Join Date" },
  { key: "status", label: "Status", type: "status" },
];

export default function HrDashboard() {
  return (
    <div className="flex flex-col gap-5">
      <PageHero icon={Users} title="Human Resources" tagline="Our People Drive Our Success" subtitle="Manage your workforce, empower your team, and build a brighter future together." quote="Great People Greater Journeys" rightNote="People Connect Logistics Move the World" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {HR_STATS.map((s, i) => (
          <StatCard key={s.label} icon={STAT_ICONS[i]} iconBg={s.iconBg} label={s.label} value={s.value} change={s.change} direction={s.direction} note={s.note} changeLabel={s.change ? "vs last month" : null} menu={false} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Attendance Overview" right={<Dropdown label="This Month" options={["This Week", "This Month", "This Year"]} />} />
          <div className="px-4 pb-2 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Present</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> On Leave</span>
          </div>
          <div className="h-56 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ATTENDANCE_OVERVIEW} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="present" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} maxBarSize={28} />
                <Bar dataKey="absent" stackId="a" fill="#ef4444" maxBarSize={28} />
                <Bar dataKey="leave" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Employee Distribution" />
          <div className="px-5 pb-5">
            <DonutStat data={EMPLOYEE_DISTRIBUTION} centerValue="248" centerLabel="Total Employees" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Leave Summary" right={<Dropdown label="This Year" options={["This Month", "This Quarter", "This Year"]} />} />
          <div className="px-5 pb-5 space-y-3">
            {LEAVE_SUMMARY.map((l) => (
              <div key={l.name}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="text-slate-600">{l.name}</span>
                  <span className="font-semibold text-slate-800">{l.value}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(l.value / LEAVE_MAX) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Recent Employees" right={<ViewAllLink />} />
          <DataTable columns={EMPLOYEE_COLUMNS} rows={RECENT_EMPLOYEES} />
        </Card>

        <Card>
          <CardHeader icon={Cake} iconColor="text-pink-500" title="Upcoming Birthdays" right={<ViewAllLink />} />
          <div className="px-5 pb-3">
            {UPCOMING_BIRTHDAYS.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-semibold">
                    {b.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-800">{b.name}</p>
                    <p className="text-[11px] text-slate-400">{b.dept} · {b.date}</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 whitespace-nowrap">{b.inDays}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Quick Actions" />
        <div className="grid grid-cols-3 md:grid-cols-9 gap-3 px-5 pb-5">
          {QUICK_ACTIONS.map((label, i) => {
            const Icon = QUICK_ICONS[i];
            return (
              <button key={label} className="flex flex-col items-center justify-center gap-2 border border-slate-200 rounded-xl py-4 hover:bg-slate-50 hover:border-blue-200 transition-colors">
                <Icon size={18} className="text-blue-600" strokeWidth={1.8} />
                <span className="text-[10px] text-slate-600 text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Department Headcount" right={<Dropdown label="This Month" options={["This Month", "This Quarter"]} />} />
          <div className="h-56 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPARTMENT_HEADCOUNT} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Employee Turnover" right={<Dropdown label="This Year" options={["Last 6 Months", "This Year"]} />} />
          <div className="h-56 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EMPLOYEE_TURNOVER} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2 text-xs">
                        <p className="font-semibold text-slate-700">{label} 2026</p>
                        <p className="text-slate-500">Turnover Rate</p>
                        <p className="font-medium text-blue-600">{d.rate}%</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Megaphone} title="Announcements" right={<ViewAllLink />} />
          <div className="px-5 pb-3">
            {ANNOUNCEMENTS.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-400 leading-snug">{a.desc}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{a.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
