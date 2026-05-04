import { db } from '../firebase';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, writeBatch, setDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';

// ==================== GURU (users collection, role=guru) ====================

export async function getTeachers() {
  const q = query(collection(db, 'users'), where('role', '==', 'guru'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addTeacher(data) {
  return await addDoc(collection(db, 'users'), {
    ...data,
    role: 'guru',
    isActive: true,
    createdAt: Timestamp.now()
  });
}

export async function updateTeacher(id, data) {
  return await updateDoc(doc(db, 'users', id), data);
}

export async function deleteTeacher(id) {
  return await deleteDoc(doc(db, 'users', id));
}

// ==================== SISWA (students collection) ====================

export async function getStudents() {
  const snap = await getDocs(collection(db, 'students'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addStudent(data) {
  return await addDoc(collection(db, 'students'), {
    ...data,
    isActive: true,
    createdAt: Timestamp.now()
  });
}

export async function updateStudent(id, data) {
  return await updateDoc(doc(db, 'students', id), data);
}

export async function deleteStudent(id) {
  return await deleteDoc(doc(db, 'students', id));
}

// ==================== KELAS (classes collection) ====================

export async function getClasses() {
  const snap = await getDocs(collection(db, 'classes'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addClass(data) {
  return await addDoc(collection(db, 'classes'), {
    ...data,
    createdAt: Timestamp.now()
  });
}

export async function updateClass(id, data) {
  return await updateDoc(doc(db, 'classes', id), data);
}

export async function deleteClass(id) {
  return await deleteDoc(doc(db, 'classes', id));
}

// ==================== MAPEL (subjects collection) ====================

export async function getSubjects() {
  const snap = await getDocs(collection(db, 'subjects'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addSubject(data) {
  return await addDoc(collection(db, 'subjects'), {
    ...data,
    isActive: true,
    createdAt: Timestamp.now()
  });
}

export async function updateSubject(id, data) {
  return await updateDoc(doc(db, 'subjects', id), data);
}

export async function deleteSubject(id) {
  return await deleteDoc(doc(db, 'subjects', id));
}

// ==================== ABSENSI (attendance collection) ====================

export async function getAttendanceByDateAndClass(date, classId) {
  const q = query(
    collection(db, 'attendance'),
    where('classId', '==', classId)
  );
  const snap = await getDocs(q);
  const results = [];
  
  const normalizeDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (typeof d.toDate === 'function') {
      const dateObj = d.toDate();
      return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    return null;
  };

  snap.docs.forEach(doc => {
    const d = { id: doc.id, ...doc.data() };
    const docDate = normalizeDate(d.date);
    if (docDate === date) {
      if (d.records && Array.isArray(d.records)) {
        // Format A: Do not return the parent id so we don't accidentally overwrite it incorrectly
        d.records.forEach(r => {
          results.push({ studentId: r.studentId, status: r.status, date: d.date, classId: d.classId });
        });
      } else if (d.studentId) {
        // Format B
        results.push(d);
      }
    }
  });
  return results;
}

export async function getAllAttendances() {
  const snap = await getDocs(collection(db, 'attendance'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveAttendance(records) {
  const batch = writeBatch(db);
  records.forEach(record => {
    if (record.id) {
      batch.update(doc(db, 'attendance', record.id), {
        status: record.status,
        updatedAt: Timestamp.now()
      });
    } else {
      const ref = doc(collection(db, 'attendance'));
      batch.set(ref, {
        ...record,
        createdAt: Timestamp.now()
      });
    }
  });
  return await batch.commit();
}

// ==================== JURNAL (journals collection) ====================

export async function getJournals(filter = {}) {
  let q;
  if (filter.startDate && filter.endDate) {
    q = query(
      collection(db, 'journals'),
      where('date', '>=', filter.startDate),
      where('date', '<=', filter.endDate)
    );
  } else {
    q = query(collection(db, 'journals'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addJournal(data) {
  return await addDoc(collection(db, 'journals'), {
    ...data,
    createdAt: Timestamp.now()
  });
}

export async function deleteJournal(id) {
  return await deleteDoc(doc(db, 'journals', id));
}

export async function verifyJournal(id) {
  return await updateDoc(doc(db, 'journals', id), {
    verified: true,
    verifiedAt: Timestamp.now()
  });
}

// ==================== GAJI / SALARY CONFIG ====================

export async function getSalaryConfig() {
  const snap = await getDoc(doc(db, 'configs', 'salaryConfig'));
  if (snap.exists()) return snap.data();
  return { rateMapel: 50000, rateEkstra: 75000, ratePramuka: 100000, ratePiket: 40000 };
}

export async function saveSalaryConfig(data) {
  return await setDoc(doc(db, 'configs', 'salaryConfig'), data, { merge: true });
}

// ==================== SCHOOL CONFIG ====================

export async function getSchoolConfig() {
  const snap = await getDoc(doc(db, 'configs', 'schoolConfig'));
  if (snap.exists()) return snap.data();
  return { name: '', npsn: '', address: '', email: '', phone: '', activeAcademicYear: '' };
}

export async function saveSchoolConfig(data) {
  return await setDoc(doc(db, 'configs', 'schoolConfig'), data, { merge: true });
}

// ==================== ACADEMIC YEARS ====================

export async function getAcademicYears() {
  const snap = await getDocs(collection(db, 'academicYears'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(limitCount = 10) {
  // Instead of an empty notifications collection, dynamically generate recent activity from journals
  const snap = await getDocs(collection(db, 'journals'));
  const usersSnap = await getDocs(collection(db, 'users'));
  
  const users = {};
  usersSnap.docs.forEach(d => { users[d.id] = d.data().name; });

  const data = snap.docs.map(d => {
    const j = d.data();
    const isPiket = j.tipeKegiatan?.toLowerCase() === 'piket';
    const teacherName = users[j.teacherId] || 'Guru';
    
    return {
      id: d.id,
      type: isPiket ? 'jadwal' : 'guru',
      title: isPiket ? 'Laporan Piket Baru' : 'Jurnal Mengajar Baru',
      message: `${teacherName} mengisi ${isPiket ? 'laporan piket' : 'jurnal'}: ${j.material || ''}`,
      createdAt: j.createdAt
    };
  });

  data.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });

  return data.slice(0, limitCount);
}

// ==================== DASHBOARD STATS ====================

export async function getDashboardStats() {
  const [students, teachers, classes] = await Promise.all([
    getDocs(collection(db, 'students')),
    getDocs(query(collection(db, 'users'), where('role', '==', 'guru'))),
    getDocs(collection(db, 'classes'))
  ]);
  return {
    totalStudents: students.size,
    totalTeachers: teachers.size,
    totalClasses: classes.size
  };
}

// ==================== SYNC: Two-Way Teacher ↔ Subject ====================

/**
 * When a teacher's subjectIds change, update the teacherIds array
 * on each affected subject document.
 * @param {string} teacherId - The teacher's document ID
 * @param {string[]} newSubjectIds - The new list of subject IDs assigned to this teacher
 * @param {string[]} oldSubjectIds - The previous list of subject IDs (before edit)
 */
export async function syncTeacherSubjects(teacherId, newSubjectIds = [], oldSubjectIds = []) {
  const batch = writeBatch(db);

  // Subjects that were removed from this teacher
  const removed = oldSubjectIds.filter(id => !newSubjectIds.includes(id));
  // Subjects that were added to this teacher
  const added = newSubjectIds.filter(id => !oldSubjectIds.includes(id));

  // Remove teacherId from removed subjects
  for (const subId of removed) {
    const subRef = doc(db, 'subjects', subId);
    batch.update(subRef, {
      teacherIds: arrayRemove(teacherId)
    });
  }

  // Add teacherId to added subjects
  for (const subId of added) {
    const subRef = doc(db, 'subjects', subId);
    batch.update(subRef, {
      teacherIds: arrayUnion(teacherId)
    });
  }

  await batch.commit();
}

// ==================== ABSENSI PIKET (dailyAttendance & teacherAttendance) ====================

export async function getDailyAttendanceByDate(date) {
  const snap = await getDocs(collection(db, 'dailyAttendance'));
  
  const normalizeDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (typeof d.toDate === 'function') {
      const dateObj = d.toDate();
      return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    return null;
  };

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (normalizeDate(data.date) === date) {
      return { id: docSnap.id, records: data.records || [] };
    }
  }
  return { id: null, records: [] };
}

export async function getAllDailyAttendances() {
  const snap = await getDocs(collection(db, 'dailyAttendance'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveDailyAttendance(date, records, existingId = null) {
  if (existingId) {
    return await updateDoc(doc(db, 'dailyAttendance', existingId), {
      records: records,
      updatedAt: Timestamp.now()
    });
  } else {
    // Need to save date as string or Timestamp depending on your app standard. 
    // The mobile app saves as Timestamp.fromDate(date)
    const [y, m, d] = date.split('-');
    const dateObj = new Date(y, m - 1, d);
    return await addDoc(collection(db, 'dailyAttendance'), {
      date: Timestamp.fromDate(dateObj),
      records: records,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
}

export async function getTeacherAttendanceByDate(date) {
  const snap = await getDocs(collection(db, 'teacherAttendance'));
  
  const normalizeDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (typeof d.toDate === 'function') {
      const dateObj = d.toDate();
      return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    return null;
  };

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (normalizeDate(data.date) === date) {
      return { id: docSnap.id, records: data.records || [] };
    }
  }
  return { id: null, records: [] };
}

export async function getAllTeacherAttendances() {
  const snap = await getDocs(collection(db, 'teacherAttendance'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveTeacherAttendance(date, records, existingId = null) {
  if (existingId) {
    return await updateDoc(doc(db, 'teacherAttendance', existingId), {
      records: records,
      updatedAt: Timestamp.now()
    });
  } else {
    const [y, m, d] = date.split('-');
    const dateObj = new Date(y, m - 1, d);
    return await addDoc(collection(db, 'teacherAttendance'), {
      date: Timestamp.fromDate(dateObj),
      records: records,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
}

/**
 * When a subject's teacherIds change, update the subjectIds array
 * on each affected teacher (user) document.
 * @param {string} subjectId - The subject's document ID
 * @param {string[]} newTeacherIds - The new list of teacher IDs assigned to this subject
 * @param {string[]} oldTeacherIds - The previous list of teacher IDs (before edit)
 */
export async function syncSubjectTeachers(subjectId, newTeacherIds = [], oldTeacherIds = []) {
  const batch = writeBatch(db);

  // Teachers that were removed from this subject
  const removed = oldTeacherIds.filter(id => !newTeacherIds.includes(id));
  // Teachers that were added to this subject
  const added = newTeacherIds.filter(id => !oldTeacherIds.includes(id));

  for (const teacherId of removed) {
    batch.update(doc(db, 'users', teacherId), {
      subjectIds: arrayRemove(subjectId)
    });
  }

  for (const teacherId of added) {
    batch.update(doc(db, 'users', teacherId), {
      subjectIds: arrayUnion(subjectId)
    });
  }

  if (removed.length > 0 || added.length > 0) {
    await batch.commit();
  }
}

// ==================== HELPERS ====================

export function formatRupiah(num) {
  if (!num && num !== 0) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
