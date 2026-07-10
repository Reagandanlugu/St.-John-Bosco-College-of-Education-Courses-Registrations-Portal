import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  School, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle,
  Layers,
  Sparkles,
  Printer,
  X,
  FileCheck2,
  Calendar,
  Layers3,
  ListRestart
} from 'lucide-react';
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from '../firebase';
import { cn } from '../lib/utils';

interface Course {
  id?: string;
  name: string;
  level: number;
  semester: number;
  type: 'Core' | 'Elective';
  department?: string;
}

interface SpecialExamRegistrationProps {
  user: any;
  studentData: any;
  departments: string[];
  courses: Course[];
  L100_GENERAL_COURSES: string[];
  setStudentTab: (tab: any) => void;
}

export interface SpecialRegItem {
  id?: string;
  studentUid: string;
  studentName: string;
  indexNumber: string;
  department: string;
  level: number;
  semester: number;
  courseName: string;
  registrationType: 'Regular' | 'Supplementary' | 'Resit';
  email: string;
  createdAt?: any;
}

export const SpecialExamRegistration: React.FC<SpecialExamRegistrationProps> = ({
  user,
  studentData,
  departments,
  courses,
  L100_GENERAL_COURSES,
  setStudentTab,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedSem, setSelectedSem] = useState<number>(1);
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [manualCourseName, setManualCourseName] = useState<string>('');
  const [isManualCourse, setIsManualCourse] = useState<boolean>(false);
  const [regType, setRegType] = useState<'Regular' | 'Supplementary' | 'Resit'>('Resit');
  
  const [specialRegs, setSpecialRegs] = useState<SpecialRegItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [printSlipsOpen, setPrintSlipsOpen] = useState<boolean>(false);
  const [slipToPrint, setSlipToPrint] = useState<SpecialRegItem | null>(null);

  // Sync state defaults when metadata loads
  useEffect(() => {
    if (studentData) {
      setSelectedDept(studentData.department || departments[0] || '');
      setSelectedLevel(studentData.year || 1);
      setSelectedSem(studentData.semester || 1);
    } else if (departments.length > 0) {
      setSelectedDept(departments[0]);
    }
  }, [studentData, departments]);

  // Real-time listener for this student's special single-course registrations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'special_registrations'),
      where('studentUid', '==', user.uid)
    );

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
      setSpecialRegs(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'special_registrations');
    });

    return () => unsubscribe();
  }, [user]);

  // Filter courses based on department, level, semester
  const availableCourses = courses.filter(c => {
    const isLevelMatch = c.level === selectedLevel * 100;
    const isSemMatch = c.semester === selectedSem;
    if (!isLevelMatch || !isSemMatch) return false;

    // Filter by department
    if (c.department && c.department !== '' && c.department.toLowerCase() !== 'general' && c.department.toLowerCase() !== 'all') {
      return c.department === selectedDept;
    }
    return true;
  });

  const getCombinedCourseList = () => {
    const fromDb = availableCourses.map(c => c.name);
    // Add L100 Fallbacks if nothing is matched
    if (selectedLevel === 1 && selectedSem === 1 && fromDb.length === 0) {
      return L100_GENERAL_COURSES;
    }
    return fromDb;
  };

  const courseOptions = getCombinedCourseList();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!studentData) {
      setErrorMsg('Please complete your profile registration first in the "My Registration" tab.');
      return;
    }

    const courseName = isManualCourse ? manualCourseName.trim() : selectedCourseName;
    if (!courseName) {
      setErrorMsg('Please select or specify a valid course to register.');
      return;
    }

    // Prevent duplicates
    const isDuplicate = specialRegs.some(
      r => r.courseName.toLowerCase() === courseName.toLowerCase() && r.registrationType === regType
    );

    if (isDuplicate) {
      setErrorMsg(`You have already registered for ${courseName} under ${regType} program sittings!`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const newReg: Omit<SpecialRegItem, 'id'> = {
      studentUid: user.uid,
      studentName: studentData.fullName,
      indexNumber: studentData.indexNumber,
      department: selectedDept,
      level: selectedLevel,
      semester: selectedSem,
      courseName: courseName,
      registrationType: regType,
      email: user.email || '',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'special_registrations'), newReg);
      setSuccessMsg(`Successfully registered "${courseName}" for ${regType}!`);
      setSelectedCourseName('');
      setManualCourseName('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e: any) {
      setErrorMsg('Failed to submit registration. Please try again.');
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReg = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to withdraw your registration for "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'special_registrations', id));
      setSuccessMsg(`Successfully withdrawn "${name}".`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <motion.div
      key="special_registration"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="grid lg:grid-cols-5 gap-8">
        
        {/* Registration Form (3 Columns wide) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black bg-rose-50 text-college-red px-3 py-1 rounded-full px-2 py-0.5 tracking-wider">
                Resits, Supplementary & Regular Enrollment
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ListRestart className="text-college-red" size={24} />
                Course & Paper Registration Form
              </h3>
              <p className="text-slate-500 text-xs font-semibold max-w-xl">
                Need to trail a past course, register an outstanding supplementary canvas, or enroll for regular credit? Complete the specifications below for academic evaluation.
              </p>
            </div>

            {/* Error & Success Modals inside form */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2"
                >
                  <AlertTriangle size={16} />
                  {errorMsg}
                </motion.div>
              )}
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {!studentData ? (
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl space-y-4 text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-slate-900 text-sm">Primary Profile Missing</h4>
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-md mx-auto">
                    You cannot submit individual course sittings without completing your main student portal registry. 
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentTab('registration')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black transition-all hover:bg-slate-800"
                >
                  Go Complete Primary Registry
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                
                {/* 1. Programme / Department */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">1. Select Programme / Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setSelectedCourseName('');
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-college-red transition-all cursor-pointer"
                    required
                  >
                    <option value="" disabled>-- Choose Department / Programme --</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Level and Semester row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">2. Academic Level</label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => {
                        setSelectedLevel(Number(e.target.value));
                        setSelectedCourseName('');
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-college-red transition-all cursor-pointer"
                      required
                    >
                      <option value={1}>Year 1 (Level 100)</option>
                      <option value={2}>Year 2 (Level 200)</option>
                      <option value={3}>Year 3 (Level 300)</option>
                      <option value={4}>Year 4 (Level 400)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">3. Semester Term</label>
                    <select
                      value={selectedSem}
                      onChange={(e) => {
                        setSelectedSem(Number(e.target.value));
                        setSelectedCourseName('');
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-college-red transition-all cursor-pointer"
                      required
                    >
                      {Array.from({ length: selectedLevel * 2 }, (_, i) => i + 1).map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Selecting the course paper */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">4. Course Unit / Exam Paper</label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-college-red cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isManualCourse}
                        onChange={(e) => setIsManualCourse(e.target.checked)}
                        className="rounded border-slate-300 text-college-red focus:ring-college-red"
                      />
                      Type manually instead
                    </label>
                  </div>

                  {isManualCourse ? (
                    <input
                      type="text"
                      placeholder="Enter specific course prefix & title..."
                      value={manualCourseName}
                      onChange={(e) => setManualCourseName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-college-red transition-all"
                      required
                    />
                  ) : (
                    <select
                      value={selectedCourseName}
                      onChange={(e) => setSelectedCourseName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-college-red transition-all cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Course Paper --</option>
                      {courseOptions.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  {!isManualCourse && courseOptions.length === 0 && (
                    <p className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} />
                      No courses pre-configured. Use "Type manually" to enter any paper name.
                    </p>
                  )}
                </div>

                {/* 4. Type of Sitting registrationType */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">5. Academic Sitting / Registration Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { 
                        type: 'Regular' as const, 
                        lbl: 'Regular Sitting', 
                        desc: 'Main semester credit block sitting.', 
                        bg: 'bg-blue-50/70', 
                        border: 'border-blue-200', 
                        selBorder: 'border-blue-600 ring-2 ring-blue-50/50', 
                        bar: 'bg-blue-600', 
                        text: 'text-blue-700' 
                      },
                      { 
                        type: 'Supplementary' as const, 
                        lbl: 'Supplementary', 
                        desc: 'Deferred paper sitting.', 
                        bg: 'bg-amber-50/70', 
                        border: 'border-amber-200', 
                        selBorder: 'border-amber-500 ring-2 ring-amber-50/50', 
                        bar: 'bg-amber-500', 
                        text: 'text-amber-700' 
                      },
                      { 
                        type: 'Resit' as const, 
                        lbl: 'Resit Exam', 
                        desc: 'Re-assessment of a trailed module.', 
                        bg: 'bg-purple-50/70', 
                        border: 'border-purple-200', 
                        selBorder: 'border-purple-600 ring-2 ring-purple-50/50', 
                        bar: 'bg-purple-600', 
                        text: 'text-purple-700' 
                      }
                    ].map((btn) => {
                      const isSel = regType === btn.type;
                      return (
                        <button
                          type="button"
                          key={btn.type}
                          onClick={() => setRegType(btn.type)}
                          className={cn(
                            "p-4 rounded-2xl border text-left flex flex-col justify-between h-28 cursor-pointer transition-all",
                            btn.bg,
                            isSel ? btn.selBorder : `${btn.border} hover:bg-white`
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={cn("text-xs font-black uppercase tracking-wider", btn.text)}>{btn.lbl}</span>
                            <div className={cn("w-2 h-2 rounded-full", isSel ? btn.bar : 'bg-slate-300')} />
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold leading-tight">{btn.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-college-red hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {isSubmitting ? 'Registering Paper...' : 'Complete Exam/Paper Registration'}
                </button>

              </form>
            )}
          </div>
        </div>

        {/* Real-time Submissions Timeline (2 Columns wide) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6 flex flex-col h-full min-h-[500px]">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-college-red rounded-full animate-pulse" />
                My Exam & Paper Registrations
              </h4>
              <p className="text-slate-400 text-xs font-semibold">
                Your interactive personal history of trailing or enrolled sittings.
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {specialRegs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic font-semibold text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                  <Layers3 className="mx-auto text-slate-300" size={24} />
                  <p>No particular exam sittings registered yet.</p>
                </div>
              ) : (
                specialRegs.map((reg) => (
                  <div 
                    key={reg.id} 
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 space-y-3 relative group hover:border-slate-300 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="space-y-0.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider block w-fit",
                          reg.registrationType === 'Regular' && "bg-blue-50 text-blue-700",
                          reg.registrationType === 'Supplementary' && "bg-amber-50 text-amber-700",
                          reg.registrationType === 'Resit' && "bg-purple-50 text-purple-700"
                        )}>
                          {reg.registrationType} Sitting
                        </span>
                        <h5 className="font-extrabold text-slate-900 text-sm leading-snug pt-1">{reg.courseName}</h5>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {reg.department} &bull; L{reg.level * 100} S{reg.semester}
                        </p>
                      </div>

                      {/* Cancel registration / Delete */}
                      <button
                        onClick={() => handleDeleteReg(reg.id!, reg.courseName)}
                        className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-white rounded-lg transition-colors"
                        title="Withdraw Registration"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-200/55 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        Registered: {reg.createdAt ? new Date(reg.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                      </span>
                      <button
                        onClick={() => {
                          setSlipToPrint(reg);
                          setPrintSlipsOpen(true);
                        }}
                        className="text-xs font-black text-college-red hover:underline flex items-center gap-1"
                      >
                        <Printer size={12} />
                        Print slip
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {studentData && (
              <div className="bg-slate-900 p-4 rounded-2xl text-white text-[11px] leading-relaxed border border-slate-800 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-college-red block">
                  Quick Checklist
                </span>
                <p className="font-semibold text-slate-300">
                  Ensure all information (Subject titles, code, level, and sitting module type) is accurate. All submitted resit entries are forwarded to the academic registration office for review.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Slip Modal window */}
      <AnimatePresence>
        {printSlipsOpen && slipToPrint && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative border border-slate-100"
            >
              {/* Close button */}
              <button
                onClick={() => setPrintSlipsOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={16} />
              </button>

              {/* Specific slip design suitable for print */}
              <div id="print-slip-area" className="space-y-6">
                
                {/* Header */}
                <div className="border-b-2 border-double border-slate-900 pb-4 text-center space-y-1">
                  <div className="w-12 h-12 bg-rose-50 text-college-red rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-black text-lg text-slate-950 uppercase tracking-tight">ST. JOHN BOSCO COLLEGE</h3>
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                    Course Unit Sitting Registration Slip
                  </p>
                </div>

                {/* Student info and registered course info */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Name</span>
                    <strong className="font-extrabold text-slate-900">{slipToPrint.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Index Number</span>
                    <strong className="font-extrabold text-slate-900">{slipToPrint.indexNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Programme</span>
                    <strong className="font-extrabold text-slate-900">{slipToPrint.department}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Academic Stage</span>
                    <strong className="font-extrabold text-slate-900">Year {slipToPrint.level} (L{slipToPrint.level * 100})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Semester Term</span>
                    <strong className="font-extrabold text-slate-900">Semester {slipToPrint.semester}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Address</span>
                    <strong className="font-extrabold text-slate-900">{slipToPrint.email}</strong>
                  </div>
                </div>

                {/* Course unit specifications table */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">Registered Module Details</span>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-extrabold text-slate-900">{slipToPrint.courseName}</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      slipToPrint.registrationType === 'Regular' && "bg-blue-50 text-blue-700",
                      slipToPrint.registrationType === 'Supplementary' && "bg-amber-50 text-amber-700",
                      slipToPrint.registrationType === 'Resit' && "bg-purple-100 text-purple-700"
                    )}>
                      {slipToPrint.registrationType}
                    </span>
                  </div>
                </div>

                {/* Stamp/Disclaimer */}
                <div className="pt-4 border-t border-dashed border-slate-200 text-center space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold leading-normal">
                    This document certifies official student application. Final approvals are strictly subject to registration fee clears and department reviews.
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    SJB Registry Date: {new Date().toLocaleDateString()}
                  </p>
                </div>

              </div>

              {/* Printable triggers */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setPrintSlipsOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-colors"
                >
                  Close Detail list
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
                >
                  <Printer size={14} />
                  Print Slip
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
