import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Printer, 
  Trash2, 
  Search, 
  Filter, 
  SlidersHorizontal,
  FolderLock,
  Layers,
  GraduationCap,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle2,
  ListFilter,
  CheckSquare,
  FileText
} from 'lucide-react';
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  query 
} from '../firebase';
import { cn } from '../lib/utils';
import { SpecialRegItem } from './SpecialExamRegistration';

interface AdminSpecialRegistrationsProps {
  departments: string[];
  courses: any[];
}

export const AdminSpecialRegistrations: React.FC<AdminSpecialRegistrationsProps> = ({
  departments,
  courses,
}) => {
  const [allRegs, setAllRegs] = useState<SpecialRegItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  
  // Tabs for the Admin Registry Workspace: 'enrollments' or 'catalog'
  const [adminSubTab, setAdminSubTab] = useState<'enrollments' | 'catalog'>('enrollments');

  // Load all special exam registrations
  useEffect(() => {
    const q = collection(db, 'special_registrations');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: SpecialRegItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SpecialRegItem);
      });
      // Sort by newest
      items.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t2 - t1;
      });
      setAllRegs(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'special_registrations');
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteReg = async (id: string, courseName: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to cancel and delete the sitting entry of "${courseName}" registered by "${studentName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'special_registrations', id));
    } catch (e: any) {
      console.error(e);
    }
  };

  // Filter registrations
  const filteredRegs = allRegs.filter(r => {
    const nameMatch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      r.indexNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.courseName.toLowerCase().includes(searchQuery.toLowerCase());
                      
    const deptMatch = selectedDeptFilter === 'All' || r.department === selectedDeptFilter;
    const typeMatch = selectedTypeFilter === 'All' || r.registrationType === selectedTypeFilter;
    
    return nameMatch && deptMatch && typeMatch;
  });

  // Calculate statistics for each department (number of courses + number of registrations)
  const getDeptStats = (dept: string) => {
    const deptCourses = courses.filter(c => c.department === dept || (!c.department && dept === 'General'));
    const deptRegs = allRegs.filter(r => r.department === dept);
    
    return {
      coursesCount: deptCourses.length,
      regsCount: deptRegs.length,
      resits: deptRegs.filter(r => r.registrationType === 'Resit').length,
      supps: deptRegs.filter(r => r.registrationType === 'Supplementary').length,
      regulars: deptRegs.filter(r => r.registrationType === 'Regular').length,
    };
  };

  // Export dynamically to CSV
  const exportToCSV = () => {
    if (filteredRegs.length === 0) return;
    
    const headers = ['Student Name', 'Index Number', 'Email', 'Department', 'Year Level', 'Semester', 'Course Name', 'Registration Type'];
    const rows = filteredRegs.map(r => [
      r.studentName,
      r.indexNumber,
      r.email,
      r.department,
      `L${r.level * 100}`,
      `S${r.semester}`,
      r.courseName,
      r.registrationType
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SJB_Exam_Sitting_Registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export dynamically to JSON
  const exportToJSON = () => {
    if (filteredRegs.length === 0) return;
    
    const jsonData = filteredRegs.map(r => ({
      studentName: r.studentName,
      indexNumber: r.indexNumber,
      email: r.email,
      department: r.department,
      level: `L${r.level * 100}`,
      semester: `S${r.semester}`,
      courseName: r.courseName,
      registrationType: r.registrationType
    }));
    
    const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `SJB_Exam_Sitting_Registrations_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header bar and navigation sub-tabs */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Exam Sittings & Academic Catalog Analyzer</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monitor individual Resit/Supplementary registrations and view course portfolios</p>
          </div>
        </div>

        {/* Workspace selector toggle */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setAdminSubTab('enrollments')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
              adminSubTab === 'enrollments'
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Users size={14} />
            Exam Enrollments ({allRegs.length})
          </button>
          <button
            onClick={() => setAdminSubTab('catalog')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
              adminSubTab === 'catalog'
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <BookOpen size={14} />
            Programmes & Courses Index
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {adminSubTab === 'enrollments' ? (
          
          /* ENROLLMENTS MANAGER */
          <motion.div
            key="enrollments_manager"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6 space-y-6"
          >
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Sitting Regs</span>
                <strong className="text-2xl font-black text-slate-900">{allRegs.length}</strong>
              </div>
              <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-purple-600 block tracking-wider">Active Resit Papers</span>
                <strong className="text-2xl font-black text-purple-800">{allRegs.filter(r => r.registrationType === 'Resit').length}</strong>
              </div>
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-amber-600 block tracking-wider">Supplementary Papers</span>
                <strong className="text-2xl font-black text-amber-800">{allRegs.filter(r => r.registrationType === 'Supplementary').length}</strong>
              </div>
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-blue-600 block tracking-wider">Regular Papers</span>
                <strong className="text-2xl font-black text-blue-800">{allRegs.filter(r => r.registrationType === 'Regular').length}</strong>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by name, course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-52"
                  />
                </div>

                {/* Dept Filter */}
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="All">All Sitting Types</option>
                  <option value="Regular">Regular Only</option>
                  <option value="Supplementary">Supplementary Only</option>
                  <option value="Resit">Resit Only</option>
                </select>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={exportToCSV}
                  disabled={filteredRegs.length === 0}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-55"
                >
                  <FileSpreadsheet size={14} />
                  Export CSV
                </button>
                <button
                  onClick={exportToJSON}
                  disabled={filteredRegs.length === 0}
                  className="py-2 px-4 bg-emerald-700 border border-emerald-800 hover:bg-emerald-650 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-55"
                >
                  <FileText size={14} />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Registrations List Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-150">
                  <tr>
                    <th className="px-6 py-4">Student Details</th>
                    <th className="px-6 py-4">Course Unit</th>
                    <th className="px-6 py-4">Academic Stage</th>
                    <th className="px-6 py-4">Sitting/Program Type</th>
                    <th className="px-6 py-4">Registered Date</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {filteredRegs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-semibold italic bg-slate-50/30">
                        No custom exam registrations found matching the specifications.
                      </td>
                    </tr>
                  ) : (
                    filteredRegs.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-900">{reg.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{reg.indexNumber} &bull; {reg.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{reg.courseName}</div>
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase">{reg.department}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-slate-700">L{reg.level * 100}</span>
                          <span className="text-slate-400 px-1 font-bold">/</span>
                          <span className="font-bold text-slate-500">Sem {reg.semester}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                            reg.registrationType === 'Regular' && "bg-blue-50 text-blue-700 border border-blue-100",
                            reg.registrationType === 'Supplementary' && "bg-amber-50 text-amber-700 border border-amber-100",
                            reg.registrationType === 'Resit' && "bg-purple-50 text-purple-700 border border-purple-100"
                          )}>
                            {reg.registrationType}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-500">
                          {reg.createdAt ? new Date(reg.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteReg(reg.id!, reg.courseName, reg.studentName)}
                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Cancel Sitting registration"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          
          /* DEPARTMENT / COURSES PORTFOLIO CATALOG INDEX */
          <motion.div
            key="catalog_index"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6 space-y-6"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">PORTFOLIO BY DIVISION & PROGRAMME</h4>
              <p className="text-slate-400 text-xs font-semibold">
                Overview of colleges, active courses and cumulative paper registrations configured.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.map((dept) => {
                const stats = getDeptStats(dept);
                
                // Get all courses belonging to this department
                const deptCoursesList = courses.filter(c => c.department === dept);

                return (
                  <div 
                    key={dept} 
                    className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-slate-300 transition-all shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-black text-indigo-600 tracking-wider">DIVISION</span>
                        <h5 className="font-extrabold text-slate-950 text-base flex items-center gap-1.5">
                          <GraduationCap size={18} className="text-slate-500" />
                          {dept}
                        </h5>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">COURSES PORTED</span>
                        <span className="font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-full">{stats.coursesCount} Units</span>
                      </div>
                    </div>

                    {/* Breakdown counts in a card row */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl text-center">
                      <div className="py-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">REGULAR</span>
                        <strong className="text-xs font-extrabold text-blue-700">{stats.regulars}</strong>
                      </div>
                      <div className="py-1 border-x border-slate-200/50">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">SUPPL.</span>
                        <strong className="text-xs font-extrabold text-amber-700">{stats.supps}</strong>
                      </div>
                      <div className="py-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">RESITS</span>
                        <strong className="text-xs font-extrabold text-purple-700">{stats.resits}</strong>
                      </div>
                    </div>

                    {/* Quick list of top Courses in this department */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Curriculum Matrix:</span>
                      <div className="max-h-24 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                        {deptCoursesList.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">No courses configured under this programme yet.</p>
                        ) : (
                          deptCoursesList.map((c, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded-lg text-slate-600 transition-colors">
                              <span>{c.name}</span>
                              <div className="flex items-center gap-1">
                                <span className="bg-white border border-slate-200 px-1 rounded text-[9px] font-black text-slate-500 uppercase tracking-wider">L{c.level}</span>
                                <span className="bg-white border border-slate-200 px-1 rounded text-[9px] font-black text-slate-500 uppercase tracking-wider">S{c.semester}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
