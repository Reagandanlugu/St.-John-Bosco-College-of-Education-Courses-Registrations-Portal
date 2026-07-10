import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  School, 
  CheckCircle2, 
  GraduationCap
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Course {
  id?: string;
  name: string;
  level: number;
  semester: number;
  type: 'Core' | 'Elective';
  department?: string;
}

interface StudentExplorerProps {
  departments: string[];
  courses: Course[];
  L100_GENERAL_COURSES: string[];
  setStudentTab: (tab: 'registration' | 'explorer') => void;
}

export const StudentExplorer: React.FC<StudentExplorerProps> = ({
  departments,
  courses,
  L100_GENERAL_COURSES,
  setStudentTab,
}) => {
  const [exDept, setExDept] = useState<string>('Sciences');
  const [exLevel, setExLevel] = useState<number>(1);
  const [exSem, setExSem] = useState<number>(1);

  // Filter courses based on department, level, semester, and type
  const filterExplorerCourses = (type: 'Core' | 'Elective') => {
    return courses.filter(c => {
      const isLevelMatch = c.level === exLevel * 100;
      const isSemMatch = c.semester === exSem;
      const isTypeMatch = c.type === type;
      if (!isLevelMatch || !isSemMatch || !isTypeMatch) return false;

      // Filter by department
      if (c.department && c.department !== '' && c.department.toLowerCase() !== 'general' && c.department.toLowerCase() !== 'all') {
        return c.department === exDept;
      }
      return true;
    });
  };

  const coreCourses = filterExplorerCourses('Core');
  const electiveCourses = filterExplorerCourses('Elective');

  return (
    <motion.div
      key="explorer"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="text-college-red" size={24} />
            Academic Catalogues & Programmes Explorer
          </h3>
          <p className="text-slate-500 font-medium max-w-xl">
            Select an academic programme and level below to preview current course structures, credit configurations, and curriculum tracks configured by administrators.
          </p>
        </div>

        {/* Step 1: Browse by Programme/Department */}
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">1. Select Programme / Department</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {departments.map((dept) => {
              const isSelected = exDept === dept;
              return (
                <button
                  key={dept}
                  onClick={() => setExDept(dept)}
                  className={cn(
                    "p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer",
                    isSelected
                      ? "bg-red-50/80 border-college-red text-college-red shadow-sm scale-[1.02]"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-college-red/10 text-college-red" : "bg-slate-100 text-slate-500"
                  )}>
                    <School size={16} />
                  </div>
                  <span className="font-extrabold text-xs tracking-tight leading-tight mt-2 line-clamp-2">{dept}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Choose Year/Level & Semester */}
        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">2. Academic Level</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 1, name: 'Year 1 (Level 100)' },
                { val: 2, name: 'Year 2 (Level 200)' },
                { val: 3, name: 'Year 3 (Level 300)' },
                { val: 4, name: 'Year 4 (Level 400)' }
              ].map((l) => {
                const isSel = exLevel === l.val;
                return (
                  <button
                    key={l.val}
                    onClick={() => {
                      setExLevel(l.val);
                      // Constraint semesters
                      const allowedSems = l.val === 1 ? [1, 2] : l.val === 2 ? [1, 2, 3, 4] : l.val === 3 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7, 8];
                      if (!allowedSems.includes(exSem)) {
                        setExSem(allowedSems[0]);
                      }
                    }}
                    className={cn(
                      "py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer",
                      isSel
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                    )}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">3. Semester Milestone</label>
            <div className="grid grid-cols-4 gap-2">
              {(exLevel === 1 ? [1, 2] :
                exLevel === 2 ? [1, 2, 3, 4] :
                exLevel === 3 ? [1, 2, 3, 4, 5, 6] :
                [1, 2, 3, 4, 5, 6, 7, 8]).map((sem) => {
                  const isSel = exSem === sem;
                  return (
                    <button
                      key={sem}
                      onClick={() => setExSem(sem)}
                      className={cn(
                        "py-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer",
                        isSel
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                      )}
                    >
                      Sem {sem}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Course list preview matching selections */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Core courses list */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-college-red rounded-full" />
              Core Courses for {exDept} (L{exLevel * 100} Sem {exSem})
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              {coreCourses.length > 0 ? (
                coreCourses.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 bg-red-50 text-college-red rounded-lg flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-slate-850 block leading-snug">{c.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {c.department ? `${c.department} Custom` : "General Core Paper"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (exLevel === 1 && exSem === 1) ? (
                L100_GENERAL_COURSES.map((course, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 bg-red-50 text-college-red rounded-lg flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-slate-850 block leading-snug">{course}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">General Core Paper</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium text-xs">No custom core courses defined by administrators yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Electives courses list */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              Available Elective Tracks
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              {electiveCourses.length > 0 ? (
                electiveCourses.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-slate-850 block leading-snug">{c.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {c.department ? `${c.department} Custom` : "General Elective Paper"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium text-xs">No optional electives configured for this level milestone.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side summary card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-[2rem] text-white shadow-xl space-y-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="text-college-red" size={24} />
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-base tracking-tight">Quick Selection Estimator</h4>
              <p className="text-slate-400 text-xs leading-relaxed font-semibold">
                Your estimated curriculum allocation details for the selected parameters:
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Selected Programme:</span>
                <span className="truncate max-w-[150px]">{exDept}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Class Target:</span>
                <span>Year {exLevel} (L{exLevel * 100})</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Semester Term:</span>
                <span>Semester {exSem}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-2 border-t border-white/10">
                <span className="text-slate-400 font-black uppercase tracking-wider text-[10px]">Estimated Course Load:</span>
                <span className="bg-red-500/20 text-college-red px-2 py-0.5 rounded-md font-black text-[11px]">
                  {(() => {
                    const totalCount = coreCourses.length + electiveCourses.length;
                    return totalCount > 0 
                      ? `${totalCount} Papers (${coreCourses.length} Core, ${electiveCourses.length} Elec)`
                      : (exLevel === 1 && exSem === 1)
                      ? `${L100_GENERAL_COURSES.length} Papers (General Core)`
                      : "0 Papers";
                  })()}
                </span>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl text-slate-300 text-[11px] font-semibold leading-relaxed border border-white/5 space-y-2">
              <p>
                🚀 Ready to enroll in these tracks?
              </p>
              <p>
                Switch back to the <strong className="text-white font-extrabold hover:underline cursor-pointer" onClick={() => setStudentTab('registration')}>My Registration</strong> tab, specify <strong className="text-college-red">{exDept}</strong> in the Department field, select year <strong className="text-white">{exLevel}</strong>, and complete registration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
