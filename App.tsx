/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType,
  Timestamp,
  isSimulatedMode,
  // Auth wrapper functions
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  // Firestore wrapper functions
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  deleteDoc,
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  orderBy, 
  serverTimestamp 
} from './firebase';
import type { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  User as UserIcon, 
  Mail, 
  Hash, 
  Calendar, 
  BookOpen, 
  Shield, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Unlock,
  Users,
  Search,
  School,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Printer,
  X,
  Filter,
  FileText,
  ArrowLeft,
  Key
} from 'lucide-react';
import { cn } from './lib/utils';
import { StudentExplorer } from './components/StudentExplorer';
import { SpecialExamRegistration } from './components/SpecialExamRegistration';
import { AdminSpecialRegistrations } from './components/AdminSpecialRegistrations';
import { ListRestart } from 'lucide-react';

import DEPARTMENTS_LIST from './data/departments.json';
import L100_GENERAL_COURSES from './data/general_courses.json';
import FALLBACK_COURSES_BY_SEMESTER_RAW from './data/fallback_courses.json';

const FALLBACK_COURSES_BY_SEMESTER = FALLBACK_COURSES_BY_SEMESTER_RAW as Record<string, string[]>;

// --- Types ---

interface Admin {
  id?: string;
  email: string;
  fullName: string;
  addedAt?: any;
  addedBy?: string;
}

interface StudentData {
  fullName: string;
  indexNumber: string;
  age: number;
  gender: string;
  email: string;
  year: number;
  semester: number;
  department: string;
  registrationType: 'Regular' | 'Supplementary' | 'Resit';
  photo?: string;
  registeredCourses?: string[];
  uid: string;
  createdAt?: any;
}

interface SystemSettings {
  registrationOpen: boolean;
  registrationStart?: any;
  registrationEnd?: any;
}

interface Course {
  id?: string;
  name: string;
  level: number;
  semester: number;
  type: 'Core' | 'Elective';
  department?: string;
}

const SJBCrest = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shield outer boundary */}
    <path d="M50 5C75 5 85 15 85 45C85 75 65 92 50 95C35 92 15 75 15 45C15 15 25 5 50 5Z" fill="#E31E24" stroke="white" strokeWidth="2.5"/>
    <path d="M50 9C71 9 79 18 79 45C79 70 62 86 50 89C38 86 21 70 21 45C21 18 29 9 50 9Z" fill="#E31E24" stroke="#FFF" strokeWidth="1" strokeDasharray="3 2"/>
    
    {/* Book representation in white */}
    <path d="M32 58C32 58 41 55 50 58C59 55 68 58 68 58V42C68 42 59 39 50 42C41 39 32 42 32 42V58Z" fill="white" />
    <path d="M50 42V58" stroke="#E31E24" strokeWidth="1"/>
    
    {/* Cross/Star or symbol of learning at top */}
    <path d="M50 16V34M41 25H59" stroke="white" strokeWidth="3" strokeLinecap="round" />
    
    {/* Ribbon or SJB label */}
    <path d="M22 72C35 76 65 76 78 72L75 66C63 69 37 69 25 66L22 72Z" fill="#0038A8" stroke="white" strokeWidth="0.5" />
    <text x="50" y="71" fill="white" fontSize="5.5" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">SJB</text>
    <text x="50" y="81" fill="white" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">EST. 1946</text>
  </svg>
);


// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' }) => {
  const variants = {
    primary: 'bg-college-red text-white hover:bg-red-700 shadow-md',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md',
    outline: 'border-2 border-college-red text-college-red hover:bg-red-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md'
  };

  return (
    <button 
      className={cn(
        'px-6 py-2.5 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, icon: Icon, labelClassName, className, ...props }: any) => (
  <div className="space-y-1.5 text-left">
    <label className={cn("text-sm font-semibold text-slate-700 flex items-center gap-2", labelClassName)}>
      {Icon && <Icon size={16} className="text-college-red" />}
      {label}
    </label>
    <input 
      className={cn("w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-college-red focus:border-transparent transition-all outline-none", className)}
      {...props}
    />
  </div>
);

const Select = ({ label, icon: Icon, options, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-college-red" />}
      {label}
    </label>
    <select 
      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-college-red focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
      {...props}
    >
      <option value="">Select {label}</option>
      {options.map((opt: any) => (
        <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
      ))}
    </select>
  </div>
);

const PhotoUpload = ({ value, onChange }: { value?: string, onChange: (base64: string) => void }) => {
  const [preview, setPreview] = useState(value);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw image to fit 200x150
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          setPreview(base64);
          onChange(base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <UserIcon size={16} className="text-college-red" />
        Passport Photo (200x150)
      </label>
      <div className="flex items-center gap-6">
        <div className="w-[200px] h-[150px] bg-white border-2 border-dashed border-slate-300 rounded-lg overflow-hidden flex items-center justify-center relative group shadow-inner">
          {preview ? (
            <img src={preview} alt="Passport Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="text-center p-4">
              <UserIcon size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-[10px] text-slate-400 font-bold uppercase">No Photo</p>
            </div>
          )}
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <span className="text-white text-xs font-bold">Change Photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-slate-500">
            Please upload a clear passport-sized photo. It will be automatically resized to 200x150 pixels.
          </p>
          <Button variant="outline" className="py-1.5 px-4 text-xs" onClick={() => document.getElementById('photo-input')?.click()}>
            Upload Photo
          </Button>
          <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({ registrationOpen: false });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allAdmins, setAllAdmins] = useState<Admin[]>([]);
  const [newAdmin, setNewAdmin] = useState<Admin>({ email: '', fullName: '' });
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [selectedSemester, setSelectedSemester] = useState<number>(0);
  const [schedStart, setSchedStart] = useState('');
  const [schedEnd, setSchedEnd] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [newCourse, setNewCourse] = useState<Course>({ name: '', level: 100, semester: 1, type: 'Core', department: '' });
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>(DEPARTMENTS_LIST);
  const [newDept, setNewDept] = useState('');
  const [studentTab, setStudentTab] = useState<'registration' | 'explorer' | 'special_registration'>('registration');
  const [exDept, setExDept] = useState<string>('Sciences');
  const [exLevel, setExLevel] = useState<number>(100);
  const [exSem, setExSem] = useState<number>(1);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [printTarget, setPrintTarget] = useState<'individual' | 'all' | null>(null);
  const [printSelectedStudent, setPrintSelectedStudent] = useState<StudentData | null>(null);
  const [printFilterType, setPrintFilterType] = useState<string>('All');
  const [printFilterDept, setPrintFilterDept] = useState<string>('All');
  const [printFilterLevel, setPrintFilterLevel] = useState<string>('All');
  const [adminRegTypeFilter, setAdminRegTypeFilter] = useState<string>('All');
  const [adminDeptFilter, setAdminDeptFilter] = useState<string>('All');
  const [customCourseInput, setCustomCourseInput] = useState<string>('');


  // Student Portal login and registration state
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRef, setStudentRef] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');
  const [studentIsRegistering, setStudentIsRegistering] = useState(false);
  const [studentLoginLoading, setStudentLoginLoading] = useState(false);
  const [studentLoginError, setStudentLoginError] = useState<string | null>(null);
  const [studentForgotMode, setStudentForgotMode] = useState(false);
  const [studentForgotEmail, setStudentForgotEmail] = useState('');
  const [studentForgotSuccess, setStudentForgotSuccess] = useState<string | null>(null);

  // Administrator login and registration state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminIsRegistering, setAdminIsRegistering] = useState(false);
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminForgotMode, setAdminForgotMode] = useState(false);
  const [adminForgotEmail, setAdminForgotEmail] = useState('');
  const [adminForgotSuccess, setAdminForgotSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const adminDoc = await getDoc(doc(db, 'admins', u.uid));
        const isOwner = u.email === "reagandanlugu09@gmail.com";
        
        if (isOwner && !adminDoc.exists()) {
          try {
            await setDoc(doc(db, 'admins', u.uid), {
              email: u.email,
              fullName: u.displayName || "Primary Owner",
              addedAt: serverTimestamp(),
              addedBy: "system"
            });
          } catch (e) {
            console.error("Auto-promotion failed", e);
          }
        }
        
        setIsAdmin(adminDoc.exists() || isOwner);
      } else {
        setIsAdmin(false);
        setIsEditingBio(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubAdmins = onSnapshot(
      collection(db, 'admins'), 
      (snapshot) => {
        setAllAdmins(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn("Failed to fetch admins:", err);
      }
    );
    return unsubAdmins;
  }, [isAdmin]);

  useEffect(() => {
    if (!user) {
      setStudentData(null);
      return;
    }

    const unsubStudent = onSnapshot(
      doc(db, 'students', user.uid), 
      (snapshot) => {
        if (snapshot.exists()) {
          setStudentData(snapshot.data() as StudentData);
        } else {
          setStudentData(null);
        }
      }, 
      (err) => {
        console.warn("Failed to fetch student data:", err);
      }
    );

    return unsubStudent;
  }, [user]);

  useEffect(() => {
    if (studentData) {
      setSelectedDept(studentData.department || '');
    }
  }, [studentData]);

  useEffect(() => {
    if (!user) {
      setSelectedDept('');
      setSelectedYear(0);
      setSelectedSemester(0);
      setSelectedElectives([]);
      setStudentTab('registration');
    }
  }, [user]);

  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'registration'), 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SystemSettings;
          setSettings(data);
          if (data.registrationStart) {
            const date = data.registrationStart.toDate();
            setSchedStart(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
          if (data.registrationEnd) {
            const date = data.registrationEnd.toDate();
            setSchedEnd(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
        } else {
          // Initialize settings if not exists
          if (isAdmin) {
            setDoc(doc(db, 'settings', 'registration'), { registrationOpen: true }).catch(err => {
              console.warn("Could not auto-initialize settings:", err);
            });
          }
        }
      },
      (err) => {
        console.warn("Failed to listen to settings (using default open settings):", err);
        setSettings({ registrationOpen: true });
      }
    );
    return unsubSettings;
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
    const unsubAll = onSnapshot(
      q, 
      (snapshot) => {
        const students = snapshot.docs.map(d => d.data() as StudentData);
        setAllStudents(students);
      },
      (err) => {
        console.warn("Failed to fetch all students:", err);
      }
    );
    return unsubAll;
  }, [isAdmin]);

  useEffect(() => {
    if (!user) {
      setCourses([]);
      setDepartments(DEPARTMENTS_LIST);
      return;
    }

    const q = query(collection(db, 'courses'), orderBy('level'), orderBy('semester'));
    const unsubCourses = onSnapshot(
      q, 
      (snapshot) => {
        const courseList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        setCourses(courseList);
      },
      (err) => {
        console.warn("Failed to fetch courses:", err);
      }
    );

    const unsubDepts = onSnapshot(
      collection(db, 'programmes'), 
      (snapshot) => {
        const dbProgs = snapshot.docs.map(d => d.data().name as string);
        // Logic: Merge hardcoded ones with DB ones, then filter out 'vi.' if requested
        const merged = [...new Set([...DEPARTMENTS_LIST, ...dbProgs])]
          .filter(name => name.toLowerCase() !== 'vi.' && name.toLowerCase() !== 'vi');
        setDepartments(merged);
      },
      (err) => {
        console.warn("Failed to fetch departments/programmes:", err);
      }
    );

    return () => {
      unsubCourses();
      unsubDepts();
    };
  }, [user]);

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("You do not have administrator permissions to manage courses.");
      return;
    }
    if (!newCourse.name) {
      alert("Course name is required.");
      return;
    }
    try {
      if (editingCourseId) {
        await updateDoc(doc(db, 'courses', editingCourseId), {
          ...newCourse
        });
        setEditingCourseId(null);
      } else {
        await addDoc(collection(db, 'courses'), newCourse);
      }
      setNewCourse({ name: '', level: 100, semester: 1, type: 'Core', department: '' });
    } catch (error) {
      alert("Failed to save course. Please check your permissions.");
      handleFirestoreError(error, OperationType.WRITE, 'courses');
    }
  };

  const startEditCourse = (course: Course) => {
    setEditingCourseId(course.id!);
    setNewCourse({
      name: course.name,
      level: course.level,
      semester: course.semester,
      type: course.type,
      department: course.department
    });
  };

  const removeCourse = async (id: string) => {
    if (!isAdmin || !id) {
      alert("You do not have administrator permissions to manage courses.");
      return;
    }
    if (!confirm('Are you sure you want to remove this course?')) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
    } catch (error) {
      alert("Failed to delete course. Please check your permissions.");
      handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
    }
  };

  const saveProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("You do not have administrator permissions to manage programmes.");
      return;
    }
    if (!newDept) {
      alert("Programme name is required.");
      return;
    }
    try {
      // Check if already exists in the collection to avoid duplicates
      await addDoc(collection(db, 'programmes'), { 
        name: newDept, 
        createdAt: serverTimestamp(),
        addedBy: user?.email || 'unknown'
      });
      setNewDept('');
    } catch (error) {
      alert("Failed to add programme. Please check your permissions.");
      handleFirestoreError(error, OperationType.WRITE, 'programmes');
    }
  };

  const removeProgramme = async (name: string) => {
    if (!isAdmin) {
      alert("You do not have administrator permissions to manage programmes.");
      return;
    }
    if (!confirm(`Are you sure you want to remove the programme: ${name}?`)) return;
    try {
      const q = query(collection(db, 'programmes'), where('name', '==', name));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        // If not in DB, it might be a default one. 
        // We filter it out locally and it won't come back from onSnapshot if we start adding others.
        setDepartments(prev => prev.filter(d => d !== name));
      } else {
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'programmes', d.id)));
        await Promise.all(deletePromises);
      }
    } catch (error) {
      alert("Failed to remove programme. Please check your permissions.");
      handleFirestoreError(error, OperationType.DELETE, 'programmes');
    }
  };

  const saveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newAdmin.email) return;
    try {
      if (editingAdminId) {
        await updateDoc(doc(db, 'admins', editingAdminId), {
          fullName: newAdmin.fullName,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid
        });
        setEditingAdminId(null);
        alert(`Admin details updated for ${newAdmin.email}`);
      } else {
        // We need to find the user's UID by email to promote them properly
        const q = query(collection(db, 'students'), where('email', '==', newAdmin.email));
        const snap = await getDocs(q);
        if (snap.empty) {
          alert("User not found in records. The user must have a student/staff profile (logged in at least once) to be promoted.");
          return;
        }
        const userId = snap.docs[0].id;
        const userData = snap.docs[0].data();
        await setDoc(doc(db, 'admins', userId), {
          email: newAdmin.email,
          fullName: newAdmin.fullName || userData.fullName,
          addedAt: serverTimestamp(),
          addedBy: user?.uid
        });
        alert(`${newAdmin.fullName || userData.fullName} promoted to Administrator!`);
      }
      setNewAdmin({ email: '', fullName: '' });
    } catch (error) {
      alert("Failed to save administrator details. Please check your permissions.");
      handleFirestoreError(error, OperationType.WRITE, 'admins');
    }
  };

  const removeAdmin = async (id: string, email: string) => {
    if (!isAdmin) {
      alert("You do not have administrator permissions to manage administrators.");
      return;
    }
    if (email === "reagandanlugu09@gmail.com") {
      alert("Cannot remove the primary system owner.");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${email} from administrators?`)) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (error) {
      alert("Failed to remove administrator. Please check your permissions.");
      handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
    }
  };

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error && error.code === 'auth/cancelled-popup-request') {
        setAuthError("An authentication popup is already open. Please complete your sign-in inside that popup or refresh the page.");
      } else if (error && error.code === 'auth/popup-closed-by-user') {
        setAuthError("The sign-in popup was closed before completing the authentication. Please try again.");
      } else if (error && error.code === 'auth/popup-blocked') {
        setAuthError("The authentication popup was blocked by your browser configuration. Please allow popups for this site and try again.");
      } else {
        setAuthError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStudentPortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoginError(null);
    setStudentForgotSuccess(null);

    const email = studentEmail.trim().toLowerCase();
    const password = studentPassword;

    if (!email) {
      setStudentLoginError("Please enter your Email Address.");
      return;
    }

    if (studentIsRegistering) {
      // Create Student Account
      const refNo = studentRef.trim();
      if (!refNo) {
        setStudentLoginError("Please enter your Student ID / Reference Number.");
        return;
      }
      if (refNo.length < 5) {
        setStudentLoginError("Student ID / Reference Number must be at least 5 characters.");
        return;
      }
      if (!password || password.length < 6) {
        setStudentLoginError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== studentConfirmPassword) {
        setStudentLoginError("Passwords do not match.");
        return;
      }

      setStudentLoginLoading(true);
      try {
        // Query to make sure the student email is unique in 'students' collection (if they already submitted registration under another account)
        const qEmail = query(collection(db, 'students'), where('email', '==', email));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          setStudentLoginError("An account with this email address has already been registered in the system.");
          setStudentLoginLoading(false);
          return;
        }

        // Query to make sure Student ID/Reference number is unique in 'students' collection
        const qRef = query(collection(db, 'students'), where('indexNumber', '==', refNo));
        const snapRef = await getDocs(qRef);
        if (!snapRef.empty) {
          setStudentLoginError("This Student ID / Reference Number is already registered under a different email address.");
          setStudentLoginLoading(false);
          return;
        }

        // Create Firebase Auth user
        await createUserWithEmailAndPassword(auth, email, password);
        // Switch out of registering state
        setStudentIsRegistering(false);
        setStudentPassword('');
        setStudentConfirmPassword('');
      } catch (err: any) {
        console.error("Student registration failed:", err);
        setStudentLoginError(err?.message || "Registration failed. Please check your network and input data.");
      } finally {
        setStudentLoginLoading(false);
      }

    } else {
      // Login Student Account
      const refNo = studentRef.trim();
      if (!refNo) {
        setStudentLoginError("Please enter your Student ID / Reference Number.");
        return;
      }
      if (!password) {
        setStudentLoginError("Please enter your password.");
        return;
      }

      setStudentLoginLoading(true);
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        
        // Fetch to check if student record exists, and if so, matches the typed index number
        const studentDoc = await getDoc(doc(db, 'students', credential.user.uid));
        if (studentDoc.exists()) {
          const sData = studentDoc.data();
          if (sData && sData.indexNumber && sData.indexNumber.trim().toLowerCase() !== refNo.toLowerCase()) {
            // Sign them back out and fail the login
            await signOut(auth);
            
            // Clear credentials on sign out
            setStudentEmail('');
            setStudentRef('');
            setStudentPassword('');
            
            setStudentLoginError("The provided Reference Number / Student ID does not match this student account.");
            setStudentLoginLoading(false);
            return;
          }
        }
      } catch (err: any) {
        console.error("Student login failed:", err);
        const code = err?.code || "";
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setStudentLoginError("Incorrect Email Address or Password. Please try again.");
        } else {
          setStudentLoginError(err?.message || "Login failed. Please verify your credentials and try again.");
        }
      } finally {
        setStudentLoginLoading(false);
      }
    }
  };

  const handleStudentForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoginError(null);
    setStudentForgotSuccess(null);

    const email = studentForgotEmail.trim().toLowerCase();
    if (!email) {
      setStudentLoginError("Please enter your Email Address to receive the password reset link.");
      return;
    }

    setStudentLoginLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setStudentForgotSuccess(`A password reset link has been successfully sent to ${email}. Please check your inbox and spam folders.`);
      setStudentForgotEmail('');
    } catch (err: any) {
      console.error("Student forgot password failed:", err);
      const code = err?.code || "";
      if (code === 'auth/user-not-found') {
        setStudentLoginError("No student account found with this email address.");
      } else {
        setStudentLoginError(err?.message || "Failed to send password reset email. Please try again.");
      }
    } finally {
      setStudentLoginLoading(false);
    }
  };

  const handleAdminPortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    setAdminForgotSuccess(null);

    const email = adminEmail.trim().toLowerCase();
    const password = adminPassword;

    if (!email) {
      setAdminLoginError("Please enter your Admin Email Address.");
      return;
    }

    if (adminIsRegistering) {
      // Register New Admin
      if (!password || password.length < 6) {
        setAdminLoginError("Password must be at least 6 characters long.");
        return;
      }

      setAdminLoginLoading(true);
      try {
        // SECURITY CHECK - Only system owner or predefined admins are allowed to register as admin!
        const isOwner = email === "reagandanlugu09@gmail.com";
        let isAuthorized = isOwner;

        if (!isOwner) {
          // Check if this email exists in 'admins' collection (registered beforehand by owner)
          const qAdmin = query(collection(db, 'admins'), where('email', '==', email));
          const snapAdmin = await getDocs(qAdmin);
          if (!snapAdmin.empty) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          setAdminLoginError("This email address is not whitelisted as an administrator. Please contact the primary system owner.");
          setAdminLoginLoading(false);
          return;
        }

        // Create Firebase account
        await createUserWithEmailAndPassword(auth, email, password);
        setAdminIsRegistering(false);
        setAdminPassword('');
      } catch (err: any) {
        console.error("Admin registration failed:", err);
        setAdminLoginError(err?.message || "Administrative account registration failed.");
      } finally {
        setAdminLoginLoading(false);
      }

    } else {
      // Login Admin
      if (!password) {
        setAdminLoginError("Please enter your password.");
        return;
      }

      setAdminLoginLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        console.error("Admin login failed:", err);
        const code = err?.code || "";
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setAdminLoginError("Incorrect Admin Email Address or Password.");
        } else {
          setAdminLoginError(err?.message || "Inability to authenticate admin. Please try again.");
        }
      } finally {
        setAdminLoginLoading(false);
      }
    }
  };

  const handleAdminForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    setAdminForgotSuccess(null);

    const email = adminForgotEmail.trim().toLowerCase();
    if (!email) {
      setAdminLoginError("Please enter your Admin Email Address.");
      return;
    }

    setAdminLoginLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setAdminForgotSuccess(`An administrative password reset link has been successfully sent to ${email}. Check your inbox.`);
      setAdminForgotEmail('');
    } catch (err: any) {
      console.error("Admin forgot password failed:", err);
      const code = err?.code || "";
      if (code === 'auth/user-not-found') {
        setAdminLoginError("No administrative account found with this email address.");
      } else {
        setAdminLoginError(err?.message || "Failed to initiate administrative password reset. Try again.");
      }
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear credentials on sign out
    setStudentEmail('');
    setStudentRef('');
    setStudentPassword('');
    setStudentConfirmPassword('');
    setStudentLoginError(null);
    setStudentIsRegistering(false);
    setStudentForgotMode(false);
    setStudentForgotSuccess(null);
    
    setAdminEmail('');
    setAdminPassword('');
    setAdminLoginError(null);
    setAdminIsRegistering(false);
    setAdminForgotMode(false);
    setAdminForgotSuccess(null);
    
    signOut(auth);
  };

  const toggleRegistration = async () => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'registration'), {
        registrationOpen: !settings.registrationOpen,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/registration');
    }
  };

  const updateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'registration'), {
        registrationStart: schedStart ? Timestamp.fromDate(new Date(schedStart)) : null,
        registrationEnd: schedEnd ? Timestamp.fromDate(new Date(schedEnd)) : null,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });
      alert('Registration schedule updated!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/registration');
    }
  };

  const isCurrentlyOpen = () => {
    if (!settings.registrationOpen) return false;
    const now = new Date();
    if (settings.registrationStart) {
      const start = settings.registrationStart.toDate();
      if (now < start) return false;
    }
    if (settings.registrationEnd) {
      const end = settings.registrationEnd.toDate();
      if (now > end) return false;
    }
    return true;
  };

  const getRegistrationStatusMessage = () => {
    if (!settings.registrationOpen) return "Registration is manually closed by administrator.";
    const now = new Date();
    if (settings.registrationStart && now < settings.registrationStart.toDate()) {
      return `Registration is scheduled to open on ${settings.registrationStart.toDate().toLocaleString()}.`;
    }
    if (settings.registrationEnd && now > settings.registrationEnd.toDate()) {
      return `Registration closed on ${settings.registrationEnd.toDate().toLocaleString()}.`;
    }
    if (settings.registrationEnd) {
      return `Registration is open until ${settings.registrationEnd.toDate().toLocaleString()}.`;
    }
    return "Registration is currently open.";
  };

  const getAvailableSemesterCourses = (levelYear: number, sem: number, dept: string) => {
    if (!levelYear || !sem) return [];
    const dbCourses = courses.filter(c => {
      const isMatch = c.level === levelYear * 100 && c.semester === sem;
      if (!isMatch) return false;
      if (c.department && c.department !== '' && c.department.toLowerCase() !== 'general' && c.department.toLowerCase() !== 'all') {
        return c.department === dept;
      }
      return true;
    });
    if (dbCourses.length > 0) {
      return dbCourses.map(c => c.name);
    }
    const fallbackKey = `${levelYear * 100}_${sem}`;
    return FALLBACK_COURSES_BY_SEMESTER[fallbackKey] || FALLBACK_COURSES_BY_SEMESTER["100_1"] || L100_GENERAL_COURSES;
  };

  const submitRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const year = Number(formData.get('year'));
    const semester = Number(formData.get('semester'));
    const studentDept = (formData.get('department') as string) || '';
    
    // Use user selected courses if checked, otherwise default to all available courses for that semester
    const availableForSem = getAvailableSemesterCourses(year, semester, studentDept);
    const finalCourses = selectedElectives.length > 0 
      ? selectedElectives 
      : availableForSem;
    
    const registrationType = (formData.get('registrationType') as 'Regular' | 'Supplementary' | 'Resit') || 'Regular';
    
    const data: StudentData = {

      fullName: formData.get('fullName') as string,
      indexNumber: formData.get('indexNumber') as string,
      age: Number(formData.get('age')),
      gender: formData.get('gender') as string,
      email: user.email || '',
      year: year,
      semester: semester,
      department: formData.get('department') as string,
      registrationType: registrationType,
      photo: photoBase64,
      registeredCourses: finalCourses,
      uid: user.uid,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'students', user.uid), data);
      setIsEditingBio(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `students/${user.uid}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const coreCoursesForForm = courses.filter(c => {
    const isMatch = c.level === selectedYear * 100 && c.semester === selectedSemester && c.type === 'Core';
    if (!isMatch) return false;
    if (c.department && c.department !== '' && c.department.toLowerCase() !== 'general' && c.department.toLowerCase() !== 'all') {
      return c.department === selectedDept;
    }
    return true;
  });

  const electiveCoursesForForm = courses.filter(c => {
    const isMatch = c.level === selectedYear * 100 && c.semester === selectedSemester && c.type === 'Elective';
    if (!isMatch) return false;
    if (c.department && c.department !== '' && c.department.toLowerCase() !== 'general' && c.department.toLowerCase() !== 'all') {
      return c.department === selectedDept;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {isSimulatedMode && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-inner border-b border-amber-700/30">
          <Clock size={14} className="animate-pulse text-amber-100" />
          <span>
            <strong>Sandbox Demo Mode Active:</strong> Running 100% offline using secure browser LocalStorage because Firebase setup was declined. All course lists, sign-up forms, registry statistics, and print slips are fully simulated and operational!
          </span>
        </div>
      )}
      {/* Header */}
      <header id="main-header" className="bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-slate-200">
        <div className="absolute bottom-0 inset-x-0 h-1 college-stripes" />
        <div id="header-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div id="brand-container" className="flex items-center gap-3">
            <div className="p-0.5 bg-white rounded-xl shadow-md border border-slate-150 flex items-center justify-center shrink-0">
              <SJBCrest className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">St. John Bosco</h1>
              <p className="text-[10px] font-bold text-college-red uppercase tracking-[0.2em]">College of Education</p>
            </div>
          </div>

          <div id="auth-controls" className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                  <p className="text-xs text-slate-500">{isAdmin ? 'Administrator' : 'Student'}</p>
                </div>
                <Button id="logout-button" variant="outline" onClick={handleLogout} className="px-3 py-2">
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Button id="login-header-button" onClick={handleLogin} disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Signing In...
                  </>
                ) : (
                  <>
                    <UserIcon size={18} />
                    Sign In
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div 
              id="landing-page"
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8 py-6 text-center"
            >
              {/* Collegiate Welcome Card with Hero Image */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40 text-left">
                <div className="relative h-64 sm:h-80 md:h-[350px] bg-slate-900 overflow-hidden">
                  <img 
                    src="/sj_bosco_gate.jpg" 
                    alt="St. John Bosco College of Education Entrance Gate" 
                    className="absolute inset-0 w-full h-full object-cover object-center scale-100 hover:scale-105 transition-transform duration-700 ease-out opacity-85"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 text-left text-white space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-college-red bg-opacity-95 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      Academic Session
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none font-sans">
                      St. John Bosco College of Education
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 max-w-3xl font-medium leading-relaxed">
                      Welcome to the official academic and course administration platform. Explore available courses, complete your semester registration, and manage student credentials securely.
                    </p>
                  </div>
                </div>
              </div>

              {authError && (
                <div className="max-w-xl mx-auto p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-4 text-left shadow-sm">
                  <AlertCircle className="shrink-0 mt-0.5 text-college-red" size={20} />
                  <div className="space-y-1 text-sm">
                    <p className="font-bold">Sign-in window interrupted</p>
                    <p className="text-slate-700 leading-relaxed font-medium">{authError}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                      Tip: If popups fail within the preview iframe, allow popups/third-party cookies, or open the application in a new tab.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-6 pt-8">
                {/* --- STUDENT PORTAL CARD --- */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-left space-y-5 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 college-stripes" />
                  {studentForgotMode ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setStudentForgotMode(false);
                            setStudentLoginError(null);
                            setStudentForgotSuccess(null);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
                          title="Back to portal login"
                          type="button"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div>
                          <h3 className="text-lg font-black text-slate-900">Forgot Student Password?</h3>
                          <p className="text-[11px] text-slate-500 font-medium">Reset your secure password via your registered email address.</p>
                        </div>
                      </div>

                      {studentLoginError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-college-red flex items-start gap-2 font-medium">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <span>{studentLoginError}</span>
                        </div>
                      )}

                      {studentForgotSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2 font-medium">
                          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                          <span>{studentForgotSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleStudentForgotPassword} className="space-y-4">
                        <Input 
                          label="Your Registered Email" 
                          placeholder="student@example.com"
                          type="email"
                          value={studentForgotEmail}
                          onChange={(e: any) => setStudentForgotEmail(e.target.value)}
                          icon={Mail}
                          required
                          disabled={studentLoginLoading}
                        />

                        <Button type="submit" disabled={studentLoginLoading} className="w-full py-3.5 bg-college-red hover:bg-red-700 text-white font-bold tracking-wide transition-colors">
                          {studentLoginLoading ? 'Sending Reset Instructions...' : 'Send Password Reset Link'}
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-50 text-college-red rounded-xl flex items-center justify-center shrink-0">
                          <GraduationCap size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900">Student Portal</h3>
                          <p className="text-xs text-slate-500 font-medium leading-normal">Register or manage your academic courses securely.</p>
                        </div>
                      </div>

                      {/* Sign In vs Register Toggle Tabs */}
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                          onClick={() => {
                            setStudentIsRegistering(false);
                            setStudentLoginError(null);
                          }}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            !studentIsRegistering 
                              ? "bg-white text-slate-900 shadow-sm" 
                              : "text-slate-500 hover:text-slate-900"
                          )}
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            setStudentIsRegistering(true);
                            setStudentLoginError(null);
                          }}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            studentIsRegistering 
                              ? "bg-white text-slate-900 shadow-sm" 
                              : "text-slate-500 hover:text-slate-900"
                          )}
                        >
                          First Time Register
                        </button>
                      </div>

                      {studentLoginError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-college-red flex items-start gap-2 font-medium">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <span>{studentLoginError}</span>
                        </div>
                      )}

                      <form onSubmit={handleStudentPortalLogin} className="space-y-4">
                        <Input 
                          label="Email Address" 
                          placeholder="e.g. student@gmail.com"
                          type="email"
                          value={studentEmail}
                          onChange={(e: any) => setStudentEmail(e.target.value)}
                          icon={Mail}
                          required
                          disabled={studentLoginLoading}
                        />

                        <Input 
                          label="Student ID / Reference Number" 
                          placeholder="e.g. SJB/2026/012"
                          type="text"
                          value={studentRef}
                          onChange={(e: any) => setStudentRef(e.target.value)}
                          icon={Hash}
                          required
                          disabled={studentLoginLoading}
                        />

                        <Input 
                          label="Password" 
                          placeholder="••••••••"
                          type="password"
                          value={studentPassword}
                          onChange={(e: any) => setStudentPassword(e.target.value)}
                          icon={Key}
                          required
                          disabled={studentLoginLoading}
                        />

                        {studentIsRegistering && (
                          <Input 
                            label="Confirm Password" 
                            placeholder="••••••••"
                            type="password"
                            value={studentConfirmPassword}
                            onChange={(e: any) => setStudentConfirmPassword(e.target.value)}
                            icon={Key}
                            required
                            disabled={studentLoginLoading}
                          />
                        )}

                        {!studentIsRegistering && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForgotMode(true);
                                setStudentLoginError(null);
                                setStudentForgotSuccess(null);
                              }}
                              className="text-xs text-college-red hover:underline font-bold"
                            >
                              Forgot Password?
                            </button>
                          </div>
                        )}

                        <Button type="submit" disabled={studentLoginLoading} className="w-full py-3.5 bg-college-red hover:bg-red-700 text-white font-bold tracking-wide transition-colors">
                          {studentLoginLoading ? (
                            <span className="flex items-center gap-2 justify-center">
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                              />
                              Processing...
                            </span>
                          ) : studentIsRegistering ? (
                            'Create Account'
                          ) : (
                            'Enter Portal'
                          )}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>

                {/* --- ADMINISTRATOR PORTAL CARD --- */}
                <div className="college-blue-gradient p-8 rounded-3xl border border-blue-900 shadow-xl shadow-blue-900/40 text-left space-y-5 transition-all duration-300 text-white relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 college-stripes" />
                  {adminForgotMode ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setAdminForgotMode(false);
                            setAdminLoginError(null);
                            setAdminForgotSuccess(null);
                          }}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                          title="Back to admin credentials login"
                          type="button"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div>
                          <h3 className="text-lg font-black text-white">Forgot Admin Password?</h3>
                          <p className="text-[11px] text-slate-400 font-medium">Verify your whitelisted address and request a secure link.</p>
                        </div>
                      </div>

                      {adminLoginError && (
                        <div className="p-3 bg-red-950 bg-opacity-50 border border-red-900 rounded-xl text-xs text-red-200 flex items-start gap-2 font-medium">
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                          <span>{adminLoginError}</span>
                        </div>
                      )}

                      {adminForgotSuccess && (
                        <div className="p-3 bg-emerald-950 bg-opacity-50 border border-emerald-900 rounded-xl text-xs text-emerald-200 flex items-start gap-2 font-medium">
                          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                          <span>{adminForgotSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleAdminForgotPassword} className="space-y-4">
                        <Input 
                          label="Whitelisted Admin Email" 
                          placeholder="admin@example.com"
                          type="email"
                          value={adminForgotEmail}
                          onChange={(e: any) => setAdminForgotEmail(e.target.value)}
                          icon={Mail}
                          required
                          disabled={adminLoginLoading}
                          labelClassName="text-slate-300"
                          className="bg-slate-800 border-slate-700 text-white focus:ring-slate-500 placeholder:text-slate-500"
                        />

                        <Button type="submit" disabled={adminLoginLoading} className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold tracking-wide transition-colors">
                          {adminLoginLoading ? 'Sending Reset Instructions...' : 'Send Password Reset Link'}
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center shrink-0">
                          <Shield size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white font-sans">Administrators</h3>
                          <p className="text-xs text-slate-400 font-medium leading-normal">Management console for whitelisted system administrators.</p>
                        </div>
                      </div>

                      {/* Sign In vs register for Admins */}
                      <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                          onClick={() => {
                            setAdminIsRegistering(false);
                            setAdminLoginError(null);
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                            !adminIsRegistering 
                              ? "bg-slate-700 text-white shadow" 
                              : "text-slate-400 hover:text-white"
                          )}
                          type="button"
                        >
                          Admin Sign In
                        </button>
                        <button
                          onClick={() => {
                            setAdminIsRegistering(true);
                            setAdminLoginError(null);
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                            adminIsRegistering 
                              ? "bg-slate-700 text-white shadow" 
                              : "text-slate-400 hover:text-white"
                          )}
                          type="button"
                        >
                          Admin Sign Up
                        </button>
                      </div>

                      {adminLoginError && (
                        <div className="p-3 bg-red-950 bg-opacity-50 border border-red-900 rounded-xl text-xs text-red-200 flex items-start gap-2 font-medium">
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                          <span>{adminLoginError}</span>
                        </div>
                      )}

                      <form onSubmit={handleAdminPortalLogin} className="space-y-4">
                        <Input 
                          label="Admin Email Address" 
                          placeholder="admin@example.com"
                          type="email"
                          value={adminEmail}
                          onChange={(e: any) => setAdminEmail(e.target.value)}
                          icon={Mail}
                          required
                          disabled={adminLoginLoading}
                          labelClassName="text-slate-300"
                          className="bg-slate-800 border-slate-700 text-white focus:ring-slate-500 placeholder:text-slate-500"
                        />

                        <Input 
                          label="Password" 
                          placeholder="••••••••"
                          type="password"
                          value={adminPassword}
                          onChange={(e: any) => setAdminPassword(e.target.value)}
                          icon={Key}
                          required
                          disabled={adminLoginLoading}
                          labelClassName="text-slate-300"
                          className="bg-slate-800 border-slate-700 text-white focus:ring-slate-500 placeholder:text-slate-500"
                        />

                        {!adminIsRegistering && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setAdminForgotMode(true);
                                setAdminLoginError(null);
                                setAdminForgotSuccess(null);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-200 hover:underline font-bold"
                            >
                              Forgot Password?
                            </button>
                          </div>
                        )}

                        <Button type="submit" disabled={adminLoginLoading} className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 hover:bg-opacity-80 text-white border border-slate-700 font-bold tracking-wide transition-colors">
                          {adminLoginLoading ? (
                            <span className="flex items-center gap-2 justify-center">
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
                              />
                              Processing...
                            </span>
                          ) : adminIsRegistering ? (
                            'Register Administrator'
                          ) : (
                            'Admin Portal Sign In'
                          )}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : isAdmin ? (
            <motion.div 
              id="admin-dashboard"
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Admin Dashboard */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">Registration Status</h3>
                    {isCurrentlyOpen() ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                        <Unlock size={12} /> OPEN
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
                        <Lock size={12} /> CLOSED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {getRegistrationStatusMessage()}
                  </p>
                  <Button 
                    variant={settings.registrationOpen ? 'danger' : 'secondary'} 
                    className="w-full"
                    onClick={toggleRegistration}
                  >
                    {settings.registrationOpen ? 'Disable Portal' : 'Enable Portal'}
                  </Button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Clock size={18} className="text-college-red" />
                    Schedule Registration
                  </h3>
                  <form onSubmit={updateSchedule} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-college-red"
                        value={schedStart}
                        onChange={(e) => setSchedStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">End Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-college-red"
                        value={schedEnd}
                        onChange={(e) => setSchedEnd(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="outline" className="w-full py-2 text-xs">
                      Update Schedule
                    </Button>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-700">Total Registered</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-college-red">{allStudents.length}</span>
                    <span className="text-slate-400 font-medium pb-1">Students</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-college-red h-full w-2/3" />
                  </div>
                  
                  {/* Category Counts Breakdown */}
                  <div id="registration-type-breakdown" className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-xl space-y-0.5">
                      <p className="text-[9px] font-black uppercase text-blue-700 tracking-wider">Regular</p>
                      <p className="text-lg font-black text-blue-900">{allStudents.filter(s => s.registrationType === 'Regular' || !s.registrationType).length}</p>
                    </div>
                    <div className="p-2 bg-amber-50/70 border border-amber-100 rounded-xl space-y-0.5">
                      <p className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Suppl.</p>
                      <p className="text-lg font-black text-amber-900">{allStudents.filter(s => s.registrationType === 'Supplementary').length}</p>
                    </div>
                    <div className="p-2 bg-purple-50/70 border border-purple-100 rounded-xl space-y-0.5">
                      <p className="text-[9px] font-black uppercase text-purple-700 tracking-wider">Resit</p>
                      <p className="text-lg font-black text-purple-900">{allStudents.filter(s => s.registrationType === 'Resit').length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-700">Quick Actions</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Portal link copied to clipboard!');
                      }}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors flex flex-col items-center gap-2"
                    >
                      <AlertCircle size={20} /> Share Link
                    </button>
                    <button 
                      onClick={() => {
                        const csvRows = [
                          ["Full Name", "Index Number", "Department", "Level", "Semester", "Registration Type", "Registered Courses Count"]
                        ];
                        allStudents.forEach(s => {
                          csvRows.push([
                            `"${s.fullName || ''}"`,
                            `"${s.indexNumber || ''}"`,
                            `"${s.department || ''}"`,
                            `"${(s.year || 1) * 100}"`,
                            `"${s.semester || 1}"`,
                            `"${s.registrationType || 'Regular'}"`,
                            `"${(s.registeredCourses || []).length}"`
                          ]);
                        });
                        const csvString = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                        const encodedUri = encodeURI(csvString);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `All_Student_Registrations_${new Date().toISOString().slice(0,10)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors flex flex-col items-center gap-2"
                    >
                      <Users size={20} /> Export CSV
                    </button>
                    <button 
                      onClick={() => {
                        const jsonData = allStudents.map(s => ({
                          fullName: s.fullName || '',
                          indexNumber: s.indexNumber || '',
                          department: s.department || '',
                          level: (s.year || 1) * 100,
                          semester: s.semester || 1,
                          registrationType: s.registrationType || 'Regular',
                          registeredCoursesCount: (s.registeredCourses || []).length,
                          registeredCourses: s.registeredCourses || []
                        }));
                        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData, null, 2));
                        const link = document.createElement("a");
                        link.setAttribute("href", jsonString);
                        link.setAttribute("download", `All_Student_Registrations_${new Date().toISOString().slice(0,10)}.json`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors flex flex-col items-center gap-2"
                    >
                      <FileText size={20} /> Export JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Administrator Registration Type Analytics & Breakdown */}
              {(() => {
                const regularCount = allStudents.filter(s => s.registrationType === 'Regular' || !s.registrationType).length;
                const supplCount = allStudents.filter(s => s.registrationType === 'Supplementary').length;
                const resitCount = allStudents.filter(s => s.registrationType === 'Resit').length;

                const filteredAdminStudents = allStudents.filter(s => {
                  const matchType = adminRegTypeFilter === 'All'
                    ? true
                    : adminRegTypeFilter === 'Regular'
                      ? (s.registrationType === 'Regular' || !s.registrationType)
                      : s.registrationType === adminRegTypeFilter;
                  const matchDept = adminDeptFilter === 'All' ? true : s.department === adminDeptFilter;
                  return matchType && matchDept;
                });

                return (
                  <div id="admin-reg-type-analytics" className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                      <div>
                        <span className="px-3 py-1 bg-red-50 text-college-red text-xs font-black uppercase tracking-wider rounded-full">
                          Administrator Analytics
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 mt-2">Registration Breakdown by Type</h3>
                        <p className="text-sm text-slate-500">View exact student totals for Regular, Supplementary, and Resit enrollments separately.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const csvRows = [
                              ["Full Name", "Index Number", "Department", "Level", "Semester", "Registration Type", "Registered Courses"]
                            ];
                            filteredAdminStudents.forEach(s => {
                              csvRows.push([
                                `"${s.fullName || ''}"`,
                                `"${s.indexNumber || ''}"`,
                                `"${s.department || ''}"`,
                                `"${(s.year || 1) * 100}"`,
                                `"${s.semester || 1}"`,
                                `"${s.registrationType || 'Regular'}"`,
                                `"${(s.registeredCourses || []).join('; ')}"`
                              ]);
                            });
                            const csvString = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                            const encodedUri = encodeURI(csvString);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `${adminRegTypeFilter}_Students_${new Date().toISOString().slice(0,10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0"
                        >
                          <Users size={16} /> Export CSV
                        </button>
                        <button
                          onClick={() => {
                            const jsonData = filteredAdminStudents.map(s => ({
                              fullName: s.fullName || '',
                              indexNumber: s.indexNumber || '',
                              department: s.department || '',
                              level: (s.year || 1) * 100,
                              semester: s.semester || 1,
                              registrationType: s.registrationType || 'Regular',
                              registeredCourses: s.registeredCourses || []
                            }));
                            const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData, null, 2));
                            const link = document.createElement("a");
                            link.setAttribute("href", jsonString);
                            link.setAttribute("download", `${adminRegTypeFilter}_Students_${new Date().toISOString().slice(0,10)}.json`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0"
                        >
                          <FileText size={16} /> Export JSON
                        </button>
                      </div>
                    </div>

                    {/* 4 Interactive Category Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div 
                        onClick={() => setAdminRegTypeFilter('All')}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer group",
                          adminRegTypeFilter === 'All' 
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.02]" 
                            : "bg-slate-50 text-slate-900 border-slate-200 hover:border-slate-400"
                        )}
                      >
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", adminRegTypeFilter === 'All' ? "text-slate-400" : "text-slate-500")}>Total Students</p>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-3xl font-black">{allStudents.length}</span>
                          <span className="text-xs font-bold opacity-75">100%</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setAdminRegTypeFilter('Regular')}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer group",
                          adminRegTypeFilter === 'Regular' 
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-[1.02]" 
                            : "bg-blue-50/60 text-blue-950 border-blue-200 hover:border-blue-400"
                        )}
                      >
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", adminRegTypeFilter === 'Regular' ? "text-blue-100" : "text-blue-700")}>Regular Students</p>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-3xl font-black">{regularCount}</span>
                          <span className="text-xs font-bold opacity-75">{allStudents.length > 0 ? Math.round((regularCount / allStudents.length) * 100) : 0}%</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setAdminRegTypeFilter('Supplementary')}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer group",
                          adminRegTypeFilter === 'Supplementary' 
                            ? "bg-amber-600 text-white border-amber-600 shadow-lg scale-[1.02]" 
                            : "bg-amber-50/60 text-amber-950 border-amber-200 hover:border-amber-400"
                        )}
                      >
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", adminRegTypeFilter === 'Supplementary' ? "text-amber-100" : "text-amber-700")}>Supplementary Students</p>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-3xl font-black">{supplCount}</span>
                          <span className="text-xs font-bold opacity-75">{allStudents.length > 0 ? Math.round((supplCount / allStudents.length) * 100) : 0}%</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setAdminRegTypeFilter('Resit')}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer group",
                          adminRegTypeFilter === 'Resit' 
                            ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-[1.02]" 
                            : "bg-purple-50/60 text-purple-950 border-purple-200 hover:border-purple-400"
                        )}
                      >
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", adminRegTypeFilter === 'Resit' ? "text-purple-100" : "text-purple-700")}>Resit Students</p>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-3xl font-black">{resitCount}</span>
                          <span className="text-xs font-bold opacity-75">{allStudents.length > 0 ? Math.round((resitCount / allStudents.length) * 100) : 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Department Breakdown Matrix */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Registration Type Breakdown by Department</h4>
                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-black uppercase">
                              <th className="py-3 px-4 border-b">Department</th>
                              <th className="py-3 px-4 border-b text-center text-blue-700">Regular</th>
                              <th className="py-3 px-4 border-b text-center text-amber-700">Supplementary</th>
                              <th className="py-3 px-4 border-b text-center text-purple-700">Resit</th>
                              <th className="py-3 px-4 border-b text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {departments.map((dept, i) => {
                              const deptStudents = allStudents.filter(s => s.department === dept);
                              if (deptStudents.length === 0) return null;
                              const dReg = deptStudents.filter(s => s.registrationType === 'Regular' || !s.registrationType).length;
                              const dSup = deptStudents.filter(s => s.registrationType === 'Supplementary').length;
                              const dRes = deptStudents.filter(s => s.registrationType === 'Resit').length;
                              return (
                                <tr key={i} className="hover:bg-slate-50 font-medium">
                                  <td className="py-3 px-4 font-bold text-slate-800">{dept}</td>
                                  <td className="py-3 px-4 text-center font-bold text-blue-800 bg-blue-50/30">{dReg}</td>
                                  <td className="py-3 px-4 text-center font-bold text-amber-800 bg-amber-50/30">{dSup}</td>
                                  <td className="py-3 px-4 text-center font-bold text-purple-800 bg-purple-50/30">{dRes}</td>
                                  <td className="py-3 px-4 text-center font-black text-slate-900">{deptStudents.length}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Filtered Student List Viewer */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">Showing {adminRegTypeFilter} Students ({filteredAdminStudents.length})</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-500">Filter Dept:</label>
                          <select
                            value={adminDeptFilter}
                            onChange={(e) => setAdminDeptFilter(e.target.value)}
                            className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 outline-none"
                          >
                            <option value="All">All Departments</option>
                            {departments.map((d, idx) => (
                              <option key={idx} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b">
                            <tr>
                              <th className="py-3 px-4">Student Name</th>
                              <th className="py-3 px-4">Index No.</th>
                              <th className="py-3 px-4">Department</th>
                              <th className="py-3 px-4 text-center">Level / Sem</th>
                              <th className="py-3 px-4 text-center">Type</th>
                              <th className="py-3 px-4 text-center">Courses</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredAdminStudents.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400 font-bold italic">No students registered under this filter yet.</td>
                              </tr>
                            ) : (
                              filteredAdminStudents.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80">
                                  <td className="py-3 px-4 font-bold text-slate-800">{s.fullName}</td>
                                  <td className="py-3 px-4 font-mono text-slate-500">{s.indexNumber}</td>
                                  <td className="py-3 px-4">{s.department}</td>
                                  <td className="py-3 px-4 text-center">L{(s.year || 1) * 100} S{s.semester || 1}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                                      (s.registrationType === 'Regular' || !s.registrationType) && "bg-blue-100 text-blue-800",
                                      s.registrationType === 'Supplementary' && "bg-amber-100 text-amber-800",
                                      s.registrationType === 'Resit' && "bg-purple-100 text-purple-800"
                                    )}>
                                      {s.registrationType || 'Regular'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold">{(s.registeredCourses || []).length}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Special Sitting Exam Enrollments & Catalogues */}
              <AdminSpecialRegistrations 

                departments={departments}
                courses={courses}
              />

              {/* Course Management */}
              {isAdmin && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-college-red text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Course Management</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add or Remove Courses for all levels</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 grid lg:grid-cols-3 gap-8">
                      {/* Add Course Form */}
                      <div className={cn(
                        "space-y-6 p-6 rounded-2xl border transition-all duration-300",
                        editingCourseId ? "border-blue-200 bg-blue-50/50" : "border-slate-100 bg-white"
                      )}>
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            {editingCourseId ? (
                              <>
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
                                  <Pencil size={16} />
                                </div>
                                <span className="text-blue-700">Edit Existing Course</span>
                              </>
                            ) : (
                              <>
                                <div className="w-8 h-8 bg-college-red text-white rounded-lg flex items-center justify-center shadow-lg shadow-red-100">
                                  <Plus size={16} />
                                </div>
                                <span>Add New Course</span>
                              </>
                            )}
                          </h4>
                          <form onSubmit={saveCourse} className="space-y-4">
                            <Input 
                              label="Course Name" 
                              placeholder="e.g. Advanced Mathematics"
                              value={newCourse.name}
                              onChange={(e: any) => setNewCourse({ ...newCourse, name: e.target.value })}
                            />
                          <div className="grid grid-cols-2 gap-4">
                            <Select 
                              label="Level" 
                              options={[100, 200, 300, 400]}
                              value={newCourse.level}
                              onChange={(e: any) => {
                                const nextLevel = Number(e.target.value);
                                const allowedSems = nextLevel === 100 ? [1, 2] : nextLevel === 200 ? [1, 2, 3, 4] : nextLevel === 300 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7, 8];
                                let nextSem = newCourse.semester;
                                if (!allowedSems.includes(nextSem)) {
                                  nextSem = 1;
                                }
                                setNewCourse({ ...newCourse, level: nextLevel, semester: nextSem });
                              }}
                            />
                            <Select 
                              label="Semester" 
                              options={
                                newCourse.level === 100 ? [1, 2] :
                                newCourse.level === 200 ? [1, 2, 3, 4] :
                                newCourse.level === 300 ? [1, 2, 3, 4, 5, 6] :
                                [1, 2, 3, 4, 5, 6, 7, 8]
                              }
                              value={newCourse.semester}
                              onChange={(e: any) => setNewCourse({ ...newCourse, semester: Number(e.target.value) })}
                            />
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Allowed Semesters (Level {newCourse.level}):</span>
                            <span className="text-college-red font-black">
                              {newCourse.level === 100 ? 'Semesters 1 - 2 (2 Total)' :
                               newCourse.level === 200 ? 'Semesters 1 - 4 (4 Total)' :
                               newCourse.level === 300 ? 'Semesters 1 - 6 (6 Total)' :
                               'Semesters 1 - 8 (8 Total)'}
                            </span>
                          </div>
                          <Select 
                            label="Type" 
                            options={['Core', 'Elective']}
                            value={newCourse.type}
                            onChange={(e: any) => setNewCourse({ ...newCourse, type: e.target.value as any })}
                          />
                          <Select 
                            label="Programme / Department (Optional)" 
                            options={['General', ...departments]}
                            value={newCourse.department || 'General'}
                            onChange={(e: any) => setNewCourse({ ...newCourse, department: e.target.value === 'General' ? '' : e.target.value })}
                          />
                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1">
                              {editingCourseId ? 'Update Course' : 'Add Course'}
                            </Button>
                            {editingCourseId && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setEditingCourseId(null);
                                  setNewCourse({ name: '', level: 100, semester: 1, type: 'Core', department: '' });
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </form>
                    </div>

                    {/* Course List */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900">Current Courses</h4>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            placeholder="Search courses..." 
                            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-college-red w-48"
                            value={courseSearchQuery}
                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {courses.filter(c => c.name.toLowerCase().includes(courseSearchQuery.toLowerCase())).length === 0 ? (
                          <div className="col-span-2 py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-400 font-medium">No courses found matching "{courseSearchQuery}".</p>
                          </div>
                        ) : (
                          courses
                            .filter(c => c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()))
                            .map((course) => (
                            <div key={course.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-college-red transition-all">
                              <div className="space-y-1">
                                <p className="font-bold text-slate-900 leading-tight">{course.name}</p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">L{course.level}</span>
                                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">S{course.semester}</span>
                                  <span className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                    course.type === 'Core' ? "bg-red-50 text-college-red" : "bg-emerald-50 text-emerald-600"
                                  )}>{course.type}</span>
                                  {course.department && (
                                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                      {course.department}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => startEditCourse(course)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit Course"
                                >
                                  <Pencil size={20} />
                                </button>
                                <button 
                                  onClick={() => removeCourse(course.id!)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Remove Course"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Administrator Management */}
              {isAdmin && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">Administrator Management</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manage Portal Staff & Permissions</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 grid lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        {editingAdminId ? <Pencil size={18} className="text-slate-900" /> : <Plus size={18} className="text-slate-900" />}
                        {editingAdminId ? 'Edit Administrator' : 'Promote to Admin'}
                      </h4>
                      <form onSubmit={saveAdmin} className="space-y-4">
                        <Input 
                          label="Staff Email" 
                          placeholder="staff@example.com"
                          type="email"
                          value={newAdmin.email}
                          onChange={(e: any) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                          disabled={!!editingAdminId}
                        />
                        <Input 
                          label="Display Name" 
                          placeholder="Full Name"
                          value={newAdmin.fullName}
                          onChange={(e: any) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                        />
                        {!editingAdminId && <p className="text-[10px] text-slate-500 italic">User must have a registered student/staff profile first.</p>}
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                            {editingAdminId ? 'Update Detail' : 'Add Administrator'}
                          </Button>
                          {editingAdminId && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                setEditingAdminId(null);
                                setNewAdmin({ email: '', fullName: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </form>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                      <h4 className="font-bold text-slate-900">Current Portal Admins</h4>
                      <div className="grid sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Always show the owner if they are not in the collection yet (bootstrap phase) */}
                        {user?.email === "reagandanlugu09@gmail.com" && !allAdmins.find(a => a.email === user.email) && (
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between text-white">
                            <div>
                              <span className="font-bold text-sm">{user.email}</span>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">System Owner (Bootstrap)</p>
                            </div>
                            <Lock size={16} />
                          </div>
                        )}
                        {allAdmins.length === 0 && user?.email !== "reagandanlugu09@gmail.com" && (
                           <div className="col-span-2 py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                             <p className="text-slate-400 text-sm italic">No other admins added.</p>
                           </div>
                        )}
                        {allAdmins.map((admin) => (
                          <div key={admin.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-900 transition-all">
                            <div>
                                <span className="font-bold text-slate-700 text-sm leading-none">{admin.email}</span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{admin.fullName}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  setEditingAdminId(admin.id!);
                                  setNewAdmin({ email: admin.email, fullName: admin.fullName });
                                }}
                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                                title="Edit Administrator"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => removeAdmin(admin.id!, admin.email)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Remove Administrator"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Programme Management */}
              {isAdmin && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Programme Management</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add or Remove Academic Programmes / Departments</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 grid lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Plus size={18} className="text-emerald-600" />
                        Add New Programme
                      </h4>
                      <form onSubmit={saveProgramme} className="space-y-4">
                        <Input 
                          label="Programme Name" 
                          placeholder="e.g. Social Studies"
                          value={newDept}
                          onChange={(e: any) => setNewDept(e.target.value)}
                        />
                        <Button type="submit" variant="secondary" className="w-full">Add Programme</Button>
                      </form>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <h4 className="font-bold text-slate-900">Current Programmes</h4>
                      <div className="grid sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {departments.map((dept, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-600 transition-all">
                            <span className="font-bold text-slate-700 text-sm">{dept}</span>
                            <button 
                              onClick={() => removeProgramme(dept)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Remove Programme"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Student List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-lg font-bold">Registered Students</h3>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      onClick={() => {
                        setPrintFilterType('All');
                        setPrintFilterDept('All');
                        setPrintFilterLevel('All');
                        setPrintTarget('all');
                      }}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-black flex items-center justify-center gap-2 border border-blue-200 transition-colors cursor-pointer"
                      title="View and Print All Registrations"
                    >
                      <Printer size={16} />
                      Print All Registrations
                    </button>
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Search by name or index..."
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                 <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Index Number</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Level</th>
                        <th className="px-6 py-4">Reg Type</th>
                        <th className="px-6 py-4">Registered Courses</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allStudents
                        .filter(s => 
                          s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.indexNumber.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((student, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {student.photo ? (
                                <img src={student.photo} className="w-10 h-8 object-cover rounded border border-slate-200" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-10 h-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                                  <UserIcon size={12} className="text-slate-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900">{student.fullName}</div>
                                <div className="text-xs text-slate-500">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-slate-600">{student.indexNumber}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{student.department}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">Year {student.year}, Sem {student.semester}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-wider",
                              student.registrationType === 'Regular' && "bg-blue-100 text-blue-800",
                              student.registrationType === 'Supplementary' && "bg-amber-100 text-amber-800",
                              student.registrationType === 'Resit' && "bg-purple-100 text-purple-800"
                            )}>
                              {student.registrationType || 'Regular'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {student.registeredCourses && student.registeredCourses.length > 0 ? (
                              <div className="flex -space-x-2 overflow-hidden">
                                {student.registeredCourses.slice(0, 3).map((_, idx) => (
                                  <div key={idx} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center">
                                    <BookOpen size={10} className="text-blue-600" />
                                  </div>
                                ))}
                                {student.registeredCourses.length > 3 && (
                                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                    +{student.registeredCourses.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase">Verified</span>
                              <button 
                                onClick={() => {
                                  setPrintSelectedStudent(student);
                                  setPrintTarget('individual');
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                                title="Print Registration Receipt / Slip"
                              >
                                <Printer size={14} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to remove ${student.fullName}?`)) {
                                    try {
                                      await deleteDoc(doc(db, 'students', student.uid));
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.DELETE, `students/${student.uid}`);
                                    }
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-50 group-hover:opacity-100 cursor-pointer"
                                title="Delete Student Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="student-portal-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Student Portal Header Tabs */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 college-stripes" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-college-red rounded-xl flex items-center justify-center">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-950">Student Workspace</h3>
                    <p className="text-xs text-slate-500 font-bold">St. John Bosco Academic Registration & Catalogues</p>
                  </div>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 self-center sm:self-auto">
                  <button
                    onClick={() => setStudentTab('registration')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                      studentTab === 'registration'
                        ? "bg-white text-college-red shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={14} />
                    My Registration
                  </button>
                  <button
                    onClick={() => setStudentTab('special_registration')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                      studentTab === 'special_registration'
                        ? "bg-white text-college-red shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <ListRestart size={14} />
                    Exam & Resit Center
                  </button>
                  <button
                    onClick={() => {
                      setStudentTab('explorer');
                      if (departments && departments.length > 0 && !departments.includes(exDept)) {
                        setExDept(departments[0]);
                      }
                    }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                      studentTab === 'explorer'
                        ? "bg-white text-college-red shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <BookOpen size={14} />
                    Courses & Programmes Explorer
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {studentTab === 'registration' ? (
                  (studentData && !isEditingBio) ? (
                    <motion.div 
                      id="registration-success-view"
                      key="registered"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-7xl mx-auto space-y-8"
                    >
                      {/* Notice Banner */}
                      <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-6 rounded-[2rem] border border-slate-800/70 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-college-red bg-rose-500/10 px-2.5 py-1 rounded-full border border-college-red/10">
                            Personal Academic Desk
                          </span>
                          <h3 className="text-xl font-black tracking-tight mt-1 flex items-center gap-1.5">
                            Hello, {studentData.fullName}!
                          </h3>
                          <p className="text-xs text-slate-300 font-semibold">Your basic registration profile and specific trail/sitting options are fully listed inline below.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button 
                            variant="outline" 
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-xs py-2 px-4 rounded-xl font-black cursor-pointer shadow flex items-center justify-center gap-1.5" 
                            onClick={() => {
                              setPrintSelectedStudent(studentData);
                              setPrintTarget('individual');
                            }}
                          >
                            <Printer size={14} />
                            Print Academic Slip
                          </Button>
                          {settings.registrationOpen && (
                            <button 
                              onClick={() => {
                                if (studentData) {
                                  setPhotoBase64(studentData.photo || '');
                                  setSelectedYear(studentData.year);
                                  setSelectedSemester(studentData.semester);
                                  setSelectedElectives(studentData.registeredCourses || []);
                                }
                                setIsEditingBio(true);
                              }}
                              className="px-4 py-2 bg-college-red text-white hover:bg-red-700 text-xs rounded-xl font-black transition-all shadow cursor-pointer border border-transparent"
                            >
                              Edit Profile Details
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Main Dual-Column Workspace */}
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                        
                        {/* LEFT COLUMN: Profile Details (2 Cols wide) */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                          <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                              <CheckCircle2 size={32} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-lg">Primary Bio Profile</h4>
                              <p className="text-xs font-semibold text-slate-400">Main course registry details</p>
                            </div>
                          </div>

                          {studentData.photo && (
                            <div className="flex justify-center pt-2">
                              <div className="p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <img src={studentData.photo} alt="Passport" className="w-[180px] h-[135px] object-cover rounded-xl" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                          )}

                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-4">
                            <div className="space-y-3 text-xs font-semibold text-slate-700">
                              <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Full Name</span>
                                <span className="font-extrabold text-slate-900 text-sm">{studentData.fullName}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50">
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Index Number</span>
                                  <span className="font-extrabold text-slate-900">{studentData.indexNumber}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Gender</span>
                                  <span className="font-bold text-slate-800">{studentData.gender || 'Not Specified'}</span>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-200/50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Department / College</span>
                                <span className="font-extrabold text-slate-900">{studentData.department}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50">
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Current Stage</span>
                                  <span className="font-extrabold text-slate-900">L{studentData.year * 100} S{studentData.semester}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sitting Style</span>
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-0.5",
                                    studentData.registrationType === 'Regular' && "bg-blue-50 text-blue-700 border border-blue-100",
                                    studentData.registrationType === 'Supplementary' && "bg-amber-50 text-amber-700 border border-amber-100",
                                    studentData.registrationType === 'Resit' && "bg-purple-50 text-purple-700 border border-purple-100"
                                  )}>
                                    {studentData.registrationType || 'Regular'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {studentData.registeredCourses && studentData.registeredCourses.length > 0 && (
                              <div className="pt-4 border-t border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registered Block Courses ({studentData.registeredCourses.length})</p>
                                <ul className="space-y-2">
                                  {studentData.registeredCourses.map((course: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-100">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                      {course}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Special Sitting Registrations (3 Cols wide) */}
                        <div className="lg:col-span-3">
                          <SpecialExamRegistration
                            user={user}
                            studentData={studentData}
                            departments={departments}
                            courses={courses}
                            L100_GENERAL_COURSES={L100_GENERAL_COURSES}
                            setStudentTab={setStudentTab}
                          />
                        </div>

                      </div>
                    </motion.div>
                  ) : !isCurrentlyOpen() ? (
            <motion.div 
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-xl mx-auto bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Lock size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Registration is Closed</h2>
                <p className="text-slate-500">
                  {getRegistrationStatusMessage()}
                </p>
              </div>
              <Button variant="outline" className="mx-auto" onClick={handleLogout}>
                Sign Out
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              id="registration-form-view"
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="college-gradient px-8 py-12 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                  <div className="relative z-10">
                    <h2 className="text-4xl font-black tracking-tight">Student Registration</h2>
                    <p className="text-red-100 mt-2 font-medium">Complete the form below to register for the current academic session.</p>
                  </div>
                </div>

                <form onSubmit={submitRegistration} className="p-8 sm:p-12 space-y-8">
                  <PhotoUpload value={photoBase64} onChange={setPhotoBase64} />
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Personal Info */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Personal Information</h3>
                      <Input 
                        label="Full Name" 
                        name="fullName" 
                        icon={UserIcon} 
                        placeholder="Enter your full legal name" 
                        defaultValue={studentData?.fullName || ""}
                        required 
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="Age" 
                          name="age" 
                          type="number" 
                          icon={Calendar} 
                          placeholder="Age" 
                          defaultValue={studentData?.age || ""}
                          required 
                        />
                        <Select 
                          label="Gender" 
                          name="gender" 
                          icon={UserIcon} 
                          options={['Male', 'Female', 'Other']} 
                          defaultValue={studentData?.gender || ""}
                          required 
                        />
                      </div>
                      <Input 
                        label="Email Address" 
                        value={user.email} 
                        icon={Mail} 
                        disabled 
                        className="bg-slate-100 cursor-not-allowed"
                      />
                    </div>

                    {/* Academic Info */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Academic Details</h3>
                      <Input 
                        label="Index / Reference Number" 
                        name="indexNumber" 
                        icon={Hash} 
                        placeholder="e.g. SJB/2024/001" 
                        defaultValue={studentData?.indexNumber || studentRef || ""}
                        required 
                      />
                      <Select 
                        label="Department" 
                        name="department" 
                        icon={BookOpen} 
                        options={departments} 
                        value={selectedDept || ""}
                        onChange={(e: any) => setSelectedDept(e.target.value)}
                        required 
                      />
                      <Select 
                        label="Registration Type" 
                        name="registrationType" 
                        icon={GraduationCap} 
                        options={['Regular', 'Supplementary', 'Resit']} 
                        defaultValue={studentData?.registrationType || "Regular"}
                        required 
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Select 
                          label="Year (Level)" 
                          name="year" 
                          icon={Calendar} 
                          options={[
                            { value: 1, label: 'Year 1 (Level 100)' },
                            { value: 2, label: 'Year 2 (Level 200)' },
                            { value: 3, label: 'Year 3 (Level 300)' },
                            { value: 4, label: 'Year 4 (Level 400)' }
                          ]} 
                          required 
                          value={selectedYear || ""}
                          onChange={(e: any) => {
                            const nextYear = Number(e.target.value);
                            setSelectedYear(nextYear);
                            const maxSem = nextYear === 1 ? 2 : nextYear === 2 ? 4 : nextYear === 3 ? 6 : 8;
                            const nextSem = (selectedSemester > maxSem || !selectedSemester) ? 1 : selectedSemester;
                            if (selectedSemester > maxSem || !selectedSemester) {
                              setSelectedSemester(nextSem);
                            }
                            setSelectedElectives(getAvailableSemesterCourses(nextYear, nextSem, selectedDept));
                          }}
                        />
                        <Select 
                          label="Semester" 
                          name="semester" 
                          icon={Calendar} 
                          options={
                            selectedYear === 1 ? [1, 2] :
                            selectedYear === 2 ? [1, 2, 3, 4] :
                            selectedYear === 3 ? [1, 2, 3, 4, 5, 6] :
                            selectedYear === 4 ? [1, 2, 3, 4, 5, 6, 7, 8] :
                            []
                          }
                          required 
                          disabled={!selectedYear}
                          value={selectedSemester || ""}
                          onChange={(e: any) => {
                            const nextSem = Number(e.target.value);
                            setSelectedSemester(nextSem);
                            setSelectedElectives(getAvailableSemesterCourses(selectedYear, nextSem, selectedDept));
                          }}
                        />
                      </div>

                      {/* Semester Allocation Information Column/Panel */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
                          <GraduationCap className="text-college-red" size={16} />
                          <span>Semester Allocations per Level</span>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {/* Level 100 Row */}
                          <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                            selectedYear === 1
                              ? "bg-red-50/80 border-college-red shadow-sm scale-[1.02]"
                              : "bg-white border-slate-100 opacity-60 hover:opacity-90"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black",
                                selectedYear === 1 ? "bg-college-red text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                1
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-950 text-xs">Level 100 (Year 1)</h4>
                                <p className="text-[10px] text-slate-400 font-bold">Entry level study</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                                2 Semesters
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Sem 1 & 2</p>
                            </div>
                          </div>

                          {/* Level 200 Row */}
                          <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                            selectedYear === 2
                              ? "bg-red-50/80 border-college-red shadow-sm scale-[1.02]"
                              : "bg-white border-slate-100 opacity-60 hover:opacity-90"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black",
                                selectedYear === 2 ? "bg-college-red text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                2
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-950 text-xs">Level 200 (Year 2)</h4>
                                <p className="text-[10px] text-slate-400 font-bold">Intermediate level study</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100">
                                4 Semesters
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Sem 1, 2, 3, 4</p>
                            </div>
                          </div>

                          {/* Level 300 Row */}
                          <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                            selectedYear === 3
                              ? "bg-red-50/80 border-college-red shadow-sm scale-[1.02]"
                              : "bg-white border-slate-100 opacity-60 hover:opacity-90"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black",
                                selectedYear === 3 ? "bg-college-red text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                3
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-950 text-xs">Level 300 (Year 3)</h4>
                                <p className="text-[10px] text-slate-400 font-bold">Advanced track study</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-100">
                                6 Semesters
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Sem 1 to 6</p>
                            </div>
                          </div>

                          {/* Level 400 Row */}
                          <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                            selectedYear === 4
                              ? "bg-red-50/80 border-college-red shadow-sm scale-[1.02]"
                              : "bg-white border-slate-100 opacity-60 hover:opacity-90"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black",
                                selectedYear === 4 ? "bg-college-red text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                4
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-950 text-xs">Level 400 (Year 4)</h4>
                                <p className="text-[10px] text-slate-400 font-bold">Final year study</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                8 Semesters
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Sem 1 to 8</p>
                            </div>
                          </div>
                        </div>

                        {selectedYear > 0 && (
                          <p className="text-[11px] text-center text-slate-500 font-extrabold bg-white p-2 rounded-xl border border-slate-150 animate-pulse">
                            💡 Selected Level {selectedYear * 100} allows {selectedYear === 1 ? '2 Semesters' : selectedYear === 2 ? '4 Semesters' : selectedYear === 3 ? '6 Semesters' : '8 Semesters'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Course Selection depending on Semester */}
                  {(selectedYear > 0 && selectedSemester > 0) && (() => {
                    const availableSemCourses = getAvailableSemesterCourses(selectedYear, selectedSemester, selectedDept);
                    const allDisplayedCourses = Array.from(new Set([...availableSemCourses, ...selectedElectives]));

                    return (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 space-y-6"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                          <div className="flex items-center gap-3 text-slate-900">
                            <div className="w-10 h-10 bg-college-red text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
                              <BookOpen size={20} />
                            </div>
                            <div>
                              <h4 className="text-xl font-black tracking-tight">Level {selectedYear * 100} Course Registration</h4>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semester {selectedSemester} Catalog</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedElectives(availableSemCourses)}
                              className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black hover:bg-emerald-200 transition-colors"
                            >
                              Select All Semester Courses
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedElectives([])}
                              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-300 transition-colors"
                            >
                              Clear Selection
                            </button>
                          </div>
                        </div>

                        <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-900 leading-relaxed font-medium">
                            <span className="font-black">Semester Course Selection:</span> Depending on whether you are registering for <span className="font-bold underline">Regular</span>, <span className="font-bold underline">Resit</span>, or <span className="font-bold underline">Supplementary</span> papers, select the exact courses you wish to register for Semester {selectedSemester}.
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                            <span>Available Courses ({selectedElectives.length} selected)</span>
                          </h5>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {allDisplayedCourses.map((courseName, idx) => {
                              const isChecked = selectedElectives.includes(courseName);
                              return (
                                <label
                                  key={idx}
                                  className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none group",
                                    isChecked
                                      ? "bg-white border-college-red shadow-sm ring-1 ring-college-red/20"
                                      : "bg-slate-100/70 border-slate-200/80 opacity-75 hover:opacity-100 hover:bg-white"
                                  )}
                                >
                                  <div className="flex items-center gap-3 pr-2">
                                    <input 
                                      type="checkbox" 
                                      className="hidden"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedElectives([...selectedElectives, courseName]);
                                        } else {
                                          setSelectedElectives(selectedElectives.filter(name => name !== courseName));
                                        }
                                      }}
                                    />
                                    <div className={cn(
                                      "w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0",
                                      isChecked 
                                        ? "bg-college-red text-white scale-105" 
                                        : "bg-white border border-slate-300 text-transparent group-hover:border-slate-400"
                                    )}>
                                      <CheckCircle2 size={14} />
                                    </div>
                                    <span className={cn(
                                      "text-xs font-bold leading-snug transition-colors",
                                      isChecked ? "text-slate-900" : "text-slate-600"
                                    )}>{courseName}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Add custom course to semester selection */}
                        <div className="pt-4 border-t border-slate-200/80 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Can&apos;t find your course? Add paper manually:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customCourseInput}
                              onChange={(e) => setCustomCourseInput(e.target.value)}
                              placeholder="Type exact course title..."
                              className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-college-red outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customCourseInput.trim() && !selectedElectives.includes(customCourseInput.trim())) {
                                  setSelectedElectives([...selectedElectives, customCourseInput.trim()]);
                                  setCustomCourseInput('');
                                }
                              }}
                              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                            >
                              + Add Course
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}

                  <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 max-w-md">
                      By submitting this form, you confirm that all information provided is accurate and belongs to you.
                    </p>
                    <div className="flex w-full sm:w-auto items-center gap-3">
                      {studentData && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full sm:w-auto px-6 py-4"
                          onClick={() => setIsEditingBio(false)}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button type="submit" className="w-full sm:w-auto px-12 py-4 text-lg">
                        {studentData ? 'Update Registration' : 'Complete Registration'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )
        ) : studentTab === 'special_registration' ? (
          <SpecialExamRegistration
            user={user}
            studentData={studentData}
            departments={departments}
            courses={courses}
            L100_GENERAL_COURSES={L100_GENERAL_COURSES}
            setStudentTab={setStudentTab}
          />
        ) : (
          <StudentExplorer 
            departments={departments}
            courses={courses}
            L100_GENERAL_COURSES={L100_GENERAL_COURSES}
            setStudentTab={setStudentTab}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <School size={20} />
            <span className="text-sm font-medium">© 2026 St. John Bosco College of Education</span>
          </div>
          <div className="flex gap-8 text-sm font-semibold text-slate-500">
            <a href="#" className="hover:text-blue-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-700 transition-colors">Academic Calendar</a>
            <a href="#" className="hover:text-blue-700 transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {/* Printable Report / Modal Overlay */}
      <AnimatePresence>
        {printTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm no-print p-4 sm:p-6 md:p-10 flex items-start justify-center"
          >
            {/* Dynamic CSS injection for neat default paper printing */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                html, body {
                  background: #fff !important;
                  color: #000 !important;
                  font-family: Arial, sans-serif !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
                .print-only {
                  display: block !important;
                }
                #print-section {
                  display: block !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 1.2cm !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                }
                #print-section table {
                  page-break-inside: auto !important;
                  break-inside: auto !important;
                  width: 100% !important;
                }
                #print-section table thead {
                  display: table-header-group !important;
                  position: sticky !important;
                  top: 0 !important;
                  background-color: #f8fafc !important;
                  z-index: 100 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                #print-section table thead tr {
                  position: sticky !important;
                  top: 0 !important;
                }
                #print-section table tr {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                .break-inside-avoid {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                /* Hide everything in root except our print section */
                #root > *:not(#print-section) {
                  display: none !important;
                }
              }
            `}} />

            <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col my-auto">
              
              {/* Header Panel (Controls) - Hidden during print */}
              <div className="p-6 bg-slate-50 border-b border-slate-150 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print shadow-sm font-sans">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-950">
                      {printTarget === 'all' ? 'Print Registrations Report' : 'Print Course Registration Ticket'}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      {printTarget === 'all' ? 'Configure Filters and print the official register' : 'Verify student registration slip and print official copy'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Printer size={16} />
                    Launch Print Dialog
                  </button>
                  <button
                    onClick={() => {
                      setPrintTarget(null);
                      setPrintSelectedStudent(null);
                    }}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                    Close Preview
                  </button>
                </div>
              </div>

              {/* Advanced Filter Toolbar for "All Registrations" - hidden in print */}
              {printTarget === 'all' && (
                <div className="p-4 bg-slate-100 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 no-print font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Registration Type</label>
                    <select
                      value={printFilterType}
                      onChange={(e) => setPrintFilterType(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="All">All Registration Types</option>
                      <option value="Regular">Regular Only</option>
                      <option value="Supplementary">Supplementary Only</option>
                      <option value="Resit">Resit Only</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Department</label>
                    <select
                      value={printFilterDept}
                      onChange={(e) => setPrintFilterDept(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="All">All Departments</option>
                      {departments.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Academic Level</label>
                    <select
                      value={printFilterLevel}
                      onChange={(e) => setPrintFilterLevel(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="All">All Levels</option>
                      <option value="100">Level 100</option>
                      <option value="200">Level 200</option>
                      <option value="300">Level 300</option>
                      <option value="400">Level 400</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Printable Body Content Wrapper */}
              <div className="p-4 sm:p-8 bg-slate-200 max-h-[70vh] overflow-y-auto flex justify-center shadow-inner">
                <div 
                  id="print-section" 
                  className="bg-white border border-slate-350 w-full rounded-2xl p-8 sm:p-12 shadow-md relative leading-relaxed font-sans"
                  style={{ minHeight: '297mm', color: '#000000', maxWidth: '210mm' }}
                >
                  
                  {/* Common Letterhead Header */}
                  <div className="text-center pb-6 border-b-2 border-black space-y-1">
                    <h1 className="text-xl font-black uppercase tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                      St. John Bosco College of Education
                    </h1>
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-600">
                      Affiliated with University of Cape Coast • Box 50, Navrongo, Ghana
                    </p>
                    <div className="h-0.5 bg-black w-20 mx-auto my-1" />
                    <p className="text-[10px] font-mono text-slate-500">
                      Printed: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* RENDER OPTION 1: ALL REGISTRATIONS REPORT */}
                  {printTarget === 'all' && (
                    <div className="mt-6 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-dashed border-slate-300">
                        <div>
                          <h2 className="text-base font-extrabold uppercase text-slate-950 tracking-tight">
                            Official Student Semester Registration Register
                          </h2>
                          <p className="text-[10px] text-slate-500 font-bold">
                            Parameters: Dept: <span className="font-extrabold text-black">{printFilterDept}</span> • Level: <span className="font-extrabold text-black">{printFilterLevel === 'All' ? 'All' : `L${printFilterLevel}`}</span> • Type: <span className="font-extrabold text-black">{printFilterType}</span>
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-center flex items-center gap-3">
                          <div>
                            <p className="text-[8px] uppercase text-slate-400">Total Count</p>
                            <p className="text-sm text-slate-950 font-black">{
                              allStudents.filter(student => {
                                if (printFilterDept !== 'All' && student.department !== printFilterDept) return false;
                                if (printFilterLevel !== 'All' && String(student.year * 100) !== printFilterLevel) return false;
                                if (printFilterType !== 'All') {
                                  if (printFilterType === 'Regular') {
                                    if (student.registrationType !== 'Regular' && student.registrationType) return false;
                                  } else {
                                    if (student.registrationType !== printFilterType) return false;
                                  }
                                }
                                return true;
                              }).length
                            }</p>
                          </div>
                          <div className="h-5 w-px bg-slate-200" />
                          <div>
                            <p className="text-[8px] uppercase text-slate-400">Active Dept</p>
                            <p className="text-slate-950">{printFilterDept === 'All' ? 'All Selected' : printFilterDept.slice(0, 15)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Summary breakdown tables */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="border border-slate-200 p-1.5 rounded-lg">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Regular</p>
                          <p className="text-xs font-black text-slate-950">
                            {
                              allStudents.filter(student => {
                                if (printFilterDept !== 'All' && student.department !== printFilterDept) return false;
                                if (printFilterLevel !== 'All' && String(student.year * 100) !== printFilterLevel) return false;
                                return student.registrationType === 'Regular' || !student.registrationType;
                              }).length
                            }
                          </p>
                        </div>
                        <div className="border border-slate-200 p-1.5 rounded-lg">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Supplementary</p>
                          <p className="text-xs font-black text-slate-950">
                            {
                              allStudents.filter(student => {
                                if (printFilterDept !== 'All' && student.department !== printFilterDept) return false;
                                if (printFilterLevel !== 'All' && String(student.year * 100) !== printFilterLevel) return false;
                                return student.registrationType === 'Supplementary';
                              }).length
                            }
                          </p>
                        </div>
                        <div className="border border-slate-200 p-1.5 rounded-lg">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Resit</p>
                          <p className="text-xs font-black text-slate-950">
                            {
                              allStudents.filter(student => {
                                if (printFilterDept !== 'All' && student.department !== printFilterDept) return false;
                                if (printFilterLevel !== 'All' && String(student.year * 100) !== printFilterLevel) return false;
                                return student.registrationType === 'Resit';
                              }).length
                            }
                          </p>
                        </div>
                      </div>

                      {/* Main Data Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="border-b-2 border-black font-extrabold uppercase text-slate-700">
                              <th className="py-2 pr-2">No.</th>
                              <th className="py-2 px-2">Student & Index</th>
                              <th className="py-2 px-2">Department</th>
                              <th className="py-2 px-2">Level/Year</th>
                              <th className="py-2 px-2 text-center">Type</th>
                              <th className="py-2 pl-2">Registered Courses</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {allStudents
                              .filter(student => {
                                if (printFilterDept !== 'All' && student.department !== printFilterDept) return false;
                                if (printFilterLevel !== 'All' && String(student.year * 100) !== printFilterLevel) return false;
                                if (printFilterType !== 'All') {
                                  if (printFilterType === 'Regular') {
                                    if (student.registrationType !== 'Regular' && student.registrationType) return false;
                                  } else {
                                    if (student.registrationType !== printFilterType) return false;
                                  }
                                }
                                return true;
                              })
                              .map((student, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2.5 pr-2 font-mono text-slate-500">{idx + 1}</td>
                                  <td className="py-2.5 px-2">
                                    <div className="font-extrabold text-slate-950">{student.fullName}</div>
                                    <div className="text-[9px] font-mono text-slate-600">{student.indexNumber}</div>
                                  </td>
                                  <td className="py-2.5 px-2 font-medium text-slate-800">{student.department}</td>
                                  <td className="py-2.5 px-2 text-slate-700">Year {student.year}, Sem {student.semester}</td>
                                  <td className="py-2.5 px-2 text-center">
                                    <span className="inline-block border border-slate-400 px-1.5 py-0.5 rounded font-black uppercase text-[8px] tracking-wide bg-slate-50">
                                      {student.registrationType || 'Regular'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 pl-2 max-w-xs text-[9px] text-slate-600 font-medium whitespace-normal">
                                    {student.registeredCourses && student.registeredCourses.length > 0 
                                      ? student.registeredCourses.join(', ')
                                      : 'No courses registered'}
                                  </td>
                                </tr>
                              ))}
                            {allStudents.filter(student => {
                              if (printFilterDept !== 'All' && student.department !== printFilterDept) return false;
                              if (printFilterLevel !== 'All' && String(student.year * 100) !== printFilterLevel) return false;
                              if (printFilterType !== 'All') {
                                  if (printFilterType === 'Regular') {
                                    if (student.registrationType !== 'Regular' && student.registrationType) return false;
                                  } else {
                                    if (student.registrationType !== printFilterType) return false;
                                  }
                                }
                              return true;
                            }).length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400 font-bold italic">
                                  No records found matching the specified parameters.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Admin Stamp & Signature area */}
                      <div className="pt-12 grid grid-cols-2 gap-12 text-center text-[10px]">
                        <div className="space-y-10">
                          <div className="h-px bg-slate-400 w-40 mx-auto" />
                          <p className="font-extrabold uppercase text-slate-600 tracking-wider">Prepared By (Registrar Office)</p>
                        </div>
                        <div className="space-y-10">
                          <div className="h-px bg-slate-400 w-40 mx-auto" />
                          <p className="font-extrabold uppercase text-slate-600 tracking-wider">Authorized Stamp & Signature</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RENDER OPTION 2: INDIVIDUAL REGISTRATION CARD */}
                  {printTarget === 'individual' && (() => {
                    const student = printSelectedStudent || studentData;
                    if (!student) return <p className="text-center py-10 font-black">No student profile selected.</p>;
                    return (
                      <div className="mt-4 space-y-5 break-inside-avoid">
                        <div className="text-center pb-3 border-b border-slate-300">
                          <h2 className="text-sm font-black uppercase text-slate-950 tracking-tight">
                            Course Registration Confirmation Slip
                          </h2>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Semester Academic Year 2026/2027
                          </p>
                        </div>

                        {/* Top: Metadata & Passport Image side-by-side */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-6">
                          
                          {/* Info Rows */}
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Full Legal Name</p>
                              <p className="font-black text-slate-950 border-b border-slate-150 pb-0.5">{student.fullName}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Index/ID Number</p>
                              <p className="font-mono font-black text-slate-950 border-b border-slate-150 pb-0.5">{student.indexNumber}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Email Address</p>
                              <p className="font-medium text-slate-800 border-b border-slate-150 pb-0.5">{student.email || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Department of Study</p>
                              <p className="font-black text-slate-950 border-b border-slate-150 pb-0.5">{student.department}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Registered Year & Level</p>
                              <p className="font-bold text-slate-800 border-b border-slate-150 pb-0.5">
                                Year {student.year} (Level {student.year * 100})
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Current Semester</p>
                              <p className="font-bold text-slate-800 border-b border-slate-150 pb-0.5">Semester {student.semester}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Registration Type</p>
                              <span className="inline-block border border-black px-1.5 py-0.5 mt-1 rounded font-black uppercase text-[10px] tracking-wider bg-slate-50">
                                {student.registrationType || 'Regular'}
                              </span>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Personal Details</p>
                              <p className="text-slate-700 leading-normal font-medium text-[10px]">
                                Age: {student.age || 'N/A'} • Gender: {student.gender || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Passport Image */}
                          {student.photo ? (
                            <div className="p-1 border border-slate-350 bg-white rounded shadow-sm flex-shrink-0">
                              <img 
                                src={student.photo} 
                                alt="Passport Photograph" 
                                className="w-28 h-32 object-cover rounded" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="w-28 h-32 border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-center gap-1.5 p-3 rounded flex-shrink-0">
                              <UserIcon size={24} />
                              <span className="text-[8px] font-bold uppercase tracking-wider">No Photo Uploaded</span>
                            </div>
                          )}

                        </div>

                        {/* Middle: Courses Breakdown Table */}
                        <div className="space-y-2 pt-2">
                          <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-widest border-l-3 border-black pl-1.5">
                            Registered Courses Detail
                          </h3>
                          <table className="w-full text-[11px] border border-slate-300 border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-800 font-extrabold uppercase border-b-2 border-slate-900">
                                <th className="py-2 px-3 border-r border-slate-300 w-12 text-center border-b-2 border-slate-900">No.</th>
                                <th className="py-2 px-3 border-r border-slate-300 border-b-2 border-slate-900">Course / Module Title</th>
                                <th className="py-2 px-3 border-r border-slate-300 w-24 text-center border-b-2 border-slate-900">Type</th>
                                <th className="py-2 px-3 w-40 border-b-2 border-slate-900">Lecturer Initial / Sign</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                              {student.registeredCourses && student.registeredCourses.length > 0 ? (
                                student.registeredCourses.map((course, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-2 px-3 border-r border-slate-300 text-center font-mono text-slate-500">
                                      0{idx + 1}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-950 whitespace-normal">
                                      {course}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-300 text-center text-slate-650 font-black text-[9px] uppercase">
                                      Credit Unit Included
                                    </td>
                                    <td className="py-2 px-3 text-slate-400 italic">
                                      _________________
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="py-5 text-center text-slate-400 font-bold italic">
                                    No courses enrolled on this confirmation slip.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Sign-offs */}
                        <div className="pt-6 grid grid-cols-2 gap-12 text-center text-[10px]">
                          <div className="space-y-6">
                            <p className="font-extrabold text-slate-700 uppercase tracking-widest">
                              Students Signature
                            </p>
                            <div className="h-px bg-slate-400 w-36 mx-auto" />
                            <p className="text-[9px] text-slate-500">Date: ________________________</p>
                          </div>
                          <div className="space-y-6">
                            <p className="font-extrabold text-slate-700 uppercase tracking-widest">
                              College Registrar / Dean Stamp
                            </p>
                            <div className="h-px bg-slate-400 w-36 mx-auto" />
                            <p className="text-[9px] text-slate-500">Authorized Official Stamp & Date</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 border border-slate-200 rounded-lg text-[9px] text-slate-500 leading-normal">
                          <p className="font-extrabold text-slate-700 mb-0.5">Rules & Advisories:</p>
                          <ol className="list-decimal list-inside space-y-0.5 font-medium">
                            <li>Keep this confirmation slip secure as proof of successful course registration.</li>
                            <li>You must present this stamped slip to gain entry into semester examination halls.</li>
                          </ol>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

