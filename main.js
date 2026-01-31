// --- Local Storage Configuration ---
const STORAGE_KEYS = {
  STUDENTS: 'edupay_students',
  SETTINGS: 'edupay_settings',
  USER_SESSION: 'edupay_user_session',
  USERS: 'edupay_users',
  SCAN_LOGS: 'edupay_scan_logs'
};

// --- Local Storage Services ---
const getStoredData = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key}`, e);
    return defaultValue;
  }
};

const setStoredData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key, value } }));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
};

const subscribeToData = (key, callback) => {
  const handler = (e) => {
    if (e.detail && e.detail.key === key) {
      callback(e.detail.value);
    }
  };
  
  window.addEventListener('local-storage-update', handler);
  
  const storageHandler = (e) => {
    if (e.key === key) {
      callback(JSON.parse(e.newValue));
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('local-storage-update', handler);
    window.removeEventListener('storage', storageHandler);
  };
};

const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// --- User Management Services ---
const initUsers = () => {
    const users = getStoredData(STORAGE_KEYS.USERS, []);
    if (users.length === 0) {
        setStoredData(STORAGE_KEYS.USERS, [{
            uid: 'admin_master',
            name: 'System Admin',
            email: 'admin@school.com',
            password: 'password', 
            role: 'ADMIN'
        }]);
    }
};

const addUser = async (user) => {
    const users = getStoredData(STORAGE_KEYS.USERS, []);
    if (users.some(u => u.email === user.email)) throw new Error("Email already exists.");
    const newUser = { ...user, uid: generateUniqueId() };
    setStoredData(STORAGE_KEYS.USERS, [...users, newUser]);
    return newUser;
};

const removeUser = async (uid) => {
    const users = getStoredData(STORAGE_KEYS.USERS, []);
    setStoredData(STORAGE_KEYS.USERS, users.filter(u => u.uid !== uid));
};

// --- Scan Logging Services ---
const logScan = (scanData) => {
    const logs = getStoredData(STORAGE_KEYS.SCAN_LOGS, []);
    const newLog = {
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        ...scanData
    };
    setStoredData(STORAGE_KEYS.SCAN_LOGS, [newLog, ...logs]);
};

const addStudent = async (student) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const students = getStoredData(STORAGE_KEYS.STUDENTS, []);
  
  // Prevent duplicates
  if (students.some(s => s.adminNumber === student.adminNumber)) {
    throw new Error("Student with this Administration Number already exists.");
  }

  const newStudent = {
    id: generateUniqueId(),
    ...student,
    gender: student.gender || 'Not Specified',
    dropLocation: student.dropLocation || '',
    parentName: student.parentName || '',
    parentContact: student.parentContact || '',
    parentRelationship: student.parentRelationship || 'Guardian',
    busNumber: student.busNumber || '',
    busName: student.busName || '',
    transport: {
      isPaid: student.transportPaid || false, 
      history: student.transportPaid ? [{ date: new Date().toISOString(), timestamp: Date.now() }] : [],
      lastPaymentDate: student.transportPaid ? new Date().toISOString() : null,
      lastScanTime: null
    },
    meal: {
      isPaid: student.mealPaid || false, 
      history: student.mealPaid ? [{ date: new Date().toISOString(), timestamp: Date.now() }] : [],
      lastPaymentDate: student.mealPaid ? new Date().toISOString() : null,
      lastScanTime: null
    }
  };
  
  setStoredData(STORAGE_KEYS.STUDENTS, [...students, newStudent]);
  return newStudent;
};

const bulkAddStudents = async (newStudentsData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const currentStudents = getStoredData(STORAGE_KEYS.STUDENTS, []);
    const now = new Date();
    const isoNow = now.toISOString();
    const timestamp = now.getTime();

    const filteredNewStudents = newStudentsData.filter(s => 
      !currentStudents.some(cs => cs.adminNumber === s.adminNumber)
    );

    const newStudents = filteredNewStudents.map(s => ({
        id: generateUniqueId(),
        name: s.name,
        gender: s.gender || 'Not Specified',
        className: s.className,
        dropLocation: s.dropLocation || '',
        parentName: s.parentName || '',
        parentContact: s.parentContact || '',
        parentRelationship: s.parentRelationship || 'Guardian',
        busNumber: s.busNumber || '',
        busName: s.busName || '',
        adminNumber: s.adminNumber,
        transport: {
            isPaid: s.transportPaid,
            history: s.transportPaid ? [{ date: isoNow, timestamp }] : [],
            lastPaymentDate: s.transportPaid ? isoNow : null,
            lastScanTime: null
        },
        meal: {
            isPaid: s.mealPaid,
            history: s.mealPaid ? [{ date: isoNow, timestamp }] : [],
            lastPaymentDate: s.mealPaid ? isoNow : null,
            lastScanTime: null
        }
    }));

    setStoredData(STORAGE_KEYS.STUDENTS, [...currentStudents, ...newStudents]);
    return newStudents.length;
};

const deleteStudent = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const students = getStoredData(STORAGE_KEYS.STUDENTS, []);
  const updatedStudents = students.filter(s => s.id !== id);
  setStoredData(STORAGE_KEYS.STUDENTS, updatedStudents);
};

const regenerateAllQrCodes = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const students = getStoredData(STORAGE_KEYS.STUDENTS, []);
    const updatedStudents = students.map(s => ({
        ...s,
        id: generateUniqueId() // Assign new unique ID
    }));
    setStoredData(STORAGE_KEYS.STUDENTS, updatedStudents);
    return updatedStudents.length;
};

const updateScanTimestamp = async (studentId, type) => {
    const students = getStoredData(STORAGE_KEYS.STUDENTS, []);
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex > -1) {
        const now = new Date().toISOString();
        // Ensure nested object existence before update
        if (!students[studentIndex][type]) {
            students[studentIndex][type] = { isPaid: false, history: [], lastPaymentDate: null };
        }
        
        students[studentIndex][type] = {
            ...students[studentIndex][type],
            lastScanTime: now
        };
        setStoredData(STORAGE_KEYS.STUDENTS, students);
    }
};

const toggleStudentPayment = async (student, type, isPaid) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const students = getStoredData(STORAGE_KEYS.STUDENTS, []);
  const studentIndex = students.findIndex(s => s.id === student.id);
  
  if (studentIndex === -1) return;

  const now = new Date();
  const currentStudent = students[studentIndex];
  const currentData = currentStudent[type] || { history: [] };
  
  let updatedTypeData = {};

  if (isPaid) {
    const newLog = {
      date: now.toISOString(),
      timestamp: now.getTime()
    };
    updatedTypeData = {
      ...currentData,
      isPaid: true,
      lastPaymentDate: now.toISOString(),
      history: [...(currentData.history || []), newLog]
    };
  } else {
    updatedTypeData = {
      ...currentData,
      isPaid: false
    };
  }
  
  students[studentIndex] = {
    ...currentStudent,
    [type]: updatedTypeData
  };

  setStoredData(STORAGE_KEYS.STUDENTS, students);
};

const getAppSettings = async () => {
  const data = getStoredData(STORAGE_KEYS.SETTINGS, {});
  if (!data.termEndDate) {
    const defaultSettings = {
        termEndDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
        termResetProcessed: false
    };
    setStoredData(STORAGE_KEYS.SETTINGS, defaultSettings);
    return defaultSettings;
  }
  return { 
      termEndDate: new Date().toISOString(),
      termResetProcessed: false,
      ...data 
  };
};

const updateAppSettings = async (settings) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const current = getStoredData(STORAGE_KEYS.SETTINGS, {});
  setStoredData(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
};

const checkAndResetTerm = async () => {
  const settings = await getAppSettings();
  const now = new Date();
  const termEnd = new Date(settings.termEndDate);

  if (now > termEnd && !settings.termResetProcessed) {
    const students = getStoredData(STORAGE_KEYS.STUDENTS, []);
    let count = 0;
    
    const updatedStudents = students.map(student => {
        let updated = false;
        let newTransport = student.transport;
        let newMeal = student.meal;

        if (student.transport?.isPaid) {
            newTransport = { ...student.transport, isPaid: false };
            updated = true;
        }
        if (student.meal?.isPaid) {
            newMeal = { ...student.meal, isPaid: false };
            updated = true;
        }

        if (updated) {
            count++;
            return { ...student, transport: newTransport, meal: newMeal };
        }
        return student;
    });

    if (count > 0 || !settings.termResetProcessed) {
       setStoredData(STORAGE_KEYS.STUDENTS, updatedStudents);
       setStoredData(STORAGE_KEYS.SETTINGS, { ...settings, termResetProcessed: true });
       return true;
    }
  }
  return false;
};

// --- Mock Auth Service ---
const mockAuth = {
    signIn: async (email, password) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        initUsers(); // Ensure defaults exist
        const users = getStoredData(STORAGE_KEYS.USERS, []);
        // Password check removed as per request to allow any login for existing users
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) throw new Error("User email not found in system.");
        
        // Set session but we'll return user to handle PIN check in UI
        return { user };
    },
    signOut: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
        window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key: STORAGE_KEYS.USER_SESSION, value: null } }));
    },
    updatePassword: async (user, newPassword) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const users = getStoredData(STORAGE_KEYS.USERS, []);
        const idx = users.findIndex(u => u.uid === user.uid);
        if (idx > -1) {
            users[idx].password = newPassword;
            setStoredData(STORAGE_KEYS.USERS, users);
            return true;
        }
        throw new Error("User not found");
    },
    getCurrentUser: () => getStoredData(STORAGE_KEYS.USER_SESSION, null)
};

// --- Components ---

// 0. Scanner Component
const Scanner = ({ students, currentUser, onClose }) => {
    const role = currentUser.role;
    const [scannedStudent, setScannedStudent] = useState(null);
    const [error, setError] = useState(null);
    const [scanResult, setScanResult] = useState(null); // 'SUCCESS', 'FAILURE', 'REPEATED', 'WRONG_BUS'
    
    // Refs for mutable data accessed in callbacks
    const studentsRef = useRef(students);
    const roleRef = useRef(role);
    const currentUserRef = useRef(currentUser);
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);

    // Keep refs synced
    useEffect(() => {
        studentsRef.current = students;
        roleRef.current = role;
        currentUserRef.current = currentUser;
    }, [students, role, currentUser]);

    const playSound = (type) => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            } else if (type === 'repeated') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else {
                // Failure
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime); 
                osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
            }
        }
    };

    const startScanning = () => {
        setError(null);
        
        // Ensure any previous instance is cleared
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
                scannerRef.current.clear();
                initNewScanner();
            }).catch(err => {
                console.error("Error stopping previous scanner", err);
                initNewScanner(); // Try anyway
            });
        } else {
            initNewScanner();
        }
    };

    const initNewScanner = () => {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        const onScanSuccess = (decodedText) => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;

            // Pause the video stream (freeze frame)
            html5QrCode.pause(true);

            const currentStudents = studentsRef.current;
            const currentRole = roleRef.current;
            const user = currentUserRef.current;

            const student = currentStudents.find(s => s.id === decodedText);
            
            let status = 'FAILURE';
            let message = "";
            let type = "INFO";

            // Determine Check Type
            // In new requirements, STAFF handles meals and transport based on their configuration
            if (user.role === 'STAFF') {
              // Determine if staff is for transport (has assigned bus) or meals
              if (user.assignedBusNumber) type = 'transport';
              else type = 'meal';
            } else if (currentRole === 'DRIVER') type = 'transport';
            else type = 'info';

            // --- LOGIC START ---

            if (!student) {
                message = "ID Invalid / Not Found";
                status = 'FAILURE';
            } else if (type === 'info') {
                // Admin View: Always Show Success
                status = 'SUCCESS';
                message = "Record Found";
            } else {
                // Check if Staff is on wrong bus
                if (type === 'transport' && user.assignedBusNumber && student.busNumber !== user.assignedBusNumber) {
                    status = 'WRONG_BUS';
                    message = "Wrong Bus - Student belongs to Bus " + (student.busNumber || "N/A");
                } else {
                    const serviceData = student[type];
                    
                    // 1. PAYMENT CHECK (Admin Settings Check)
                    if (!serviceData || !serviceData.isPaid) {
                        status = 'FAILURE';
                        message = "Not Approved"; // Updated for prompt: "red not approved"
                    } else {
                        // 2. COOLDOWN CHECK (12-Hour Logic)
                        const lastScan = serviceData.lastScanTime;
                        
                        if (lastScan) {
                            const lastScanDate = new Date(lastScan);
                            const now = new Date();
                            const diff = differenceInHours(now, lastScanDate);
                            
                            if (diff < 12) {
                                status = 'REPEATED';
                                message = `Repeated: Wait ${12 - diff}h`;
                            } else {
                                status = 'SUCCESS';
                                message = "Approved";
                            }
                        } else {
                            // First time scan
                            status = 'SUCCESS';
                            message = "Approved";
                        }
                    }
                }
            }
            // --- LOGIC END ---

            // Log Scan
            logScan({
                studentName: student ? student.name : 'Unknown',
                studentId: decodedText,
                studentGender: student ? student.gender : '-',
                studentClass: student ? student.className : '-',
                studentLocation: student ? student.dropLocation : '-',
                type: type === 'info' ? 'QUERY' : type.toUpperCase(),
                status: status,
                message: message,
                scannedBy: user.email,
                scannedByName: user.name
            });

            // Update UI
            setScannedStudent(student);
            setScanResult(status);
            setError(status === 'SUCCESS' ? null : message);

            // Actions based on Result
            if (status === 'SUCCESS') {
                if (type !== 'info' && student) {
                    updateScanTimestamp(student.id, type);
                }
                playSound('success');
            } else if (status === 'REPEATED') {
                playSound('repeated');
            } else if (status === 'WRONG_BUS') {
                playSound('failure');
            } else {
                playSound('failure');
            }

            // Cooldown and Resume
            setTimeout(() => {
                setScanResult(null);
                setScannedStudent(null);
                setError(null);
                isProcessingRef.current = false;
                try {
                    html5QrCode.resume();
                } catch (e) {
                    console.error("Failed to resume scanner", e);
                    // If resume fails, try restarting
                    startScanning();
                }
            }, 4000); // Increased display time for detailed info
        };

        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            onScanSuccess,
            (errorMessage) => { 
                // Parse error, ignore
            }
        ).catch(err => {
            console.error("Error starting scanner", err);
            // Handle permission errors explicitly
            if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
                 setError("Camera permission denied. Please allow access and retry.");
            } else if (err.name === 'NotFoundError') {
                 setError("No camera found on this device.");
            } else {
                 setError("Failed to start camera. " + (err.message || ""));
            }
        });
    };

    useEffect(() => {
        // Slight delay to ensure DOM is ready and previous instances are cleared
        const timer = setTimeout(() => {
            startScanning();
        }, 300); // Increased delay for stability

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().then(() => {
                        scannerRef.current.clear();
                    }).catch(console.error);
                } else {
                    scannerRef.current.clear().catch(console.error);
                }
            }
        };
    }, []); 

    const handleRetry = () => {
         // Force a clear and restart - user gesture often fixes NotAllowedError
         if (scannerRef.current) {
             scannerRef.current.clear().catch(() => {}).finally(() => {
                 startScanning();
             });
         } else {
             startScanning();
         }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 p-2 bg-white rounded-full">
                    <X size={24} />
                </button>
                
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
                        QR Scanner
                    </h2>
                    
                    <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden mb-4">
                        {/* The Reader element MUST always exist for html5-qrcode to work */}
                        <div id="reader" className="w-full h-full"></div>
                        
                        {/* Error State with Retry */}
                        {error && !scanResult && (
                            <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-gray-600 z-20 p-6 text-center">
                                <AlertTriangle size={48} className="text-red-500 mb-2" />
                                <p className="mb-4 text-sm font-medium">{error}</p>
                                <button 
                                    onClick={handleRetry}
                                    className="bg-primary text-white px-6 py-2 rounded-full font-bold shadow hover:bg-blue-700 transition flex items-center gap-2"
                                >
                                    <Camera size={18} /> Retry Camera
                                </button>
                            </div>
                        )}

                        {/* Success Overlay */}
                        {scanResult === 'SUCCESS' && (
                            <div className="absolute inset-0 bg-green-500 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 z-20">
                                <CheckCircle size={80} className="mb-4" />
                                <h3 className="text-3xl font-bold text-center px-4">{scannedStudent?.name}</h3>
                                <p className="text-xl mt-2 font-medium opacity-90">{scannedStudent?.className}</p>
                                <div className="mt-6 bg-white text-green-600 font-bold px-6 py-2 rounded-full text-lg shadow-lg">
                                    APPROVED
                                </div>
                            </div>
                        )}

                         {/* Repeated Overlay */}
                         {scanResult === 'REPEATED' && (
                            <div className="absolute inset-0 bg-yellow-500 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 z-20">
                                <AlertTriangle size={80} className="mb-4" />
                                <h3 className="text-2xl font-bold text-center px-4">
                                    {scannedStudent ? scannedStudent.name : 'Unknown'}
                                </h3>
                                <div className="mt-6 bg-white text-yellow-600 font-bold px-6 py-2 rounded-full text-lg shadow-lg">
                                    REPEATED
                                </div>
                                <p className="text-lg mt-4 font-medium opacity-90 text-center px-6 bg-black/20 py-2 rounded">
                                    {error}
                                </p>
                            </div>
                        )}

                         {/* Error/Failure Overlay */}
                         {scanResult === 'FAILURE' && (
                            <div className="absolute inset-0 bg-red-600 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 z-20">
                                <XCircle size={80} className="mb-4" />
                                <h3 className="text-2xl font-bold text-center px-4">
                                    {scannedStudent ? scannedStudent.name : 'Unknown Code'}
                                </h3>
                                <div className="mt-6 bg-white text-red-600 font-bold px-6 py-2 rounded-full text-lg shadow-lg">
                                    NOT APPROVED
                                </div>
                                <p className="text-lg mt-4 font-medium opacity-90 text-center px-6 bg-black/20 py-2 rounded">
                                    {message}
                                </p>
                            </div>
                        )}

                        {/* WRONG BUS OVERLAY - NEW REQUIREMENT */}
                        {scanResult === 'WRONG_BUS' && (
                            <div className="absolute inset-0 bg-orange-600 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300 z-20 p-4">
                                <Bus size={64} className="mb-2" />
                                <h3 className="text-xl font-bold text-center mb-2 uppercase">Switch Bus</h3>
                                <div className="bg-white/10 p-4 rounded-xl w-full space-y-2 text-sm">
                                    <p><span className="opacity-70">Name:</span> <strong>{scannedStudent?.name}</strong></p>
                                    <p><span className="opacity-70">Gender:</span> <strong>{scannedStudent?.gender}</strong></p>
                                    <p><span className="opacity-70">Class:</span> <strong>{scannedStudent?.className}</strong></p>
                                    <p><span className="opacity-70">Correct Bus:</span> <strong>{scannedStudent?.busNumber}</strong></p>
                                    <p><span className="opacity-70">Drop Point:</span> <strong>{scannedStudent?.dropLocation}</strong></p>
                                </div>
                                <div className="mt-4 bg-white text-orange-600 font-bold px-6 py-2 rounded-full text-sm shadow-lg text-center">
                                    STUDENT TO ENTER BUS {scannedStudent?.busNumber}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {!scanResult && !error && (
                        <p className="text-center text-gray-500 text-sm">Align QR code within the frame</p>
                    )}
                    {scanResult === 'SUCCESS' && (
                        <p className="text-center text-green-600 font-bold animate-pulse">Scan Successful! Next scan in a moment...</p>
                    )}
                     {scanResult === 'REPEATED' && (
                        <p className="text-center text-yellow-600 font-bold animate-pulse">Already Scanned! Resetting...</p>
                    )}
                     {scanResult === 'FAILURE' && (
                        <p className="text-center text-red-600 font-bold animate-pulse">Scan Rejected! Resetting...</p>
                    )}
                     {scanResult === 'WRONG_BUS' && (
                        <p className="text-center text-orange-600 font-bold animate-pulse">Mismatched Bus! Resetting...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// 1. Auth Component
const Auth = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');

  // Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('STAFF');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('CREDENTIALS'); // CREDENTIALS or PIN
  const [tempUser, setTempUser] = useState(null);

  useEffect(() => {
      initUsers();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await mockAuth.signIn(email, password);
      
      if (result.user.role === 'ADMIN') {
          setTempUser(result.user);
          setStage('PIN');
          setLoading(false);
      } else {
          // Staff login immediately (no PIN needed)
          onLoginSuccess(result.user);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
          const newUser = {
              name: regName,
              email: regEmail,
              password: regPassword, 
              role: regRole
          };

          await addUser(newUser);
          
          // Auto-login logic
          if (newUser.role === 'ADMIN') {
              setTempUser(newUser);
              setStage('PIN');
              setLoading(false);
          } else {
              onLoginSuccess(newUser);
          }
      } catch (err) {
          setError(err.message || "Registration failed");
          setLoading(false);
      }
  };
  
  const verifyPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (pin === '2026') {
        onLoginSuccess(tempUser);
      } else {
        setError('Incorrect Admin PIN.');
        setLoading(false);
      }
    } catch (err) {
        setError('Failed to verify PIN.');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 bg-primary text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <GraduationCap className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">EduPay</h2>
          <p className="text-blue-100 opacity-90">Secure Payment Management</p>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
             {stage === 'PIN' ? 'Admin Verification' : (isRegistering ? 'Create Account' : 'Login to Dashboard')}
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center animate-pulse">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          {stage === 'CREDENTIALS' && !isRegistering && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    placeholder="name@school.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:shadow-lg transition duration-200 
                    ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {stage === 'CREDENTIALS' && isRegistering && (
              <form onSubmit={handleRegister} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition" placeholder="John Doe" />
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition" placeholder="name@school.com" />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition" placeholder="••••••••" minLength={4} />
                    </div>
                  </div>

                   {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-3 top-3 text-gray-400" size={18} />
                      <select value={regRole} onChange={(e) => setRegRole(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition bg-white text-gray-700">
                        <option value="STAFF">Staff (Meals/Transport)</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className={`w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:shadow-lg transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {loading ? 'Creating Account...' : 'Sign Up'}
                  </button>
              </form>
          )}
          
          {stage === 'PIN' && (
            <form onSubmit={verifyPin} className="space-y-6">
                <div className="text-center text-sm text-gray-500 mb-4">
                    Please enter the <strong>Admin PIN</strong> to continue.
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Enter PIN</label>
                    <div className="relative max-w-[200px] mx-auto">
                        <KeyRound className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="password"
                            required
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-center tracking-widest font-mono text-lg"
                            placeholder="1234"
                            autoFocus
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {loading ? 'Verifying...' : 'Access Dashboard'}
                </button>
                <button 
                    type="button" 
                    onClick={() => { setStage('CREDENTIALS'); setError(''); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
                >
                    Use different account
                </button>
            </form>
          )}

          {stage === 'CREDENTIALS' && (
              <div className="mt-6 text-center border-t border-gray-100 pt-4">
                <button 
                    type="button"
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-sm font-medium text-primary hover:text-blue-700 hover:underline transition"
                >
                    {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. Scan History Component
const ScanHistory = () => {
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [viewType, setViewType] = useState('ALL'); // ALL or TRANSPORT

    useEffect(() => {
        setLogs(getStoredData(STORAGE_KEYS.SCAN_LOGS, []));
        const unsubscribe = subscribeToData(STORAGE_KEYS.SCAN_LOGS, (newLogs) => setLogs(newLogs));
        return () => unsubscribe();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesView = viewType === 'ALL' || (viewType === 'TRANSPORT' && log.type === 'TRANSPORT');
        const matchesSearch = 
            log.studentName.toLowerCase().includes(search.toLowerCase()) ||
            log.scannedByName?.toLowerCase().includes(search.toLowerCase()) ||
            log.status.toLowerCase().includes(search.toLowerCase());
        return matchesView && matchesSearch;
    });

    return (
        <div className="space-y-6">
             <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Activity Logs</h2>
                <p className="text-gray-500">History of all QR scans performed by users.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search logs by student name or scanner..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                </div>
                <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <button onClick={() => setViewType('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewType === 'ALL' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>All Scans</button>
                    <button onClick={() => setViewType('TRANSPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewType === 'TRANSPORT' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Transport Only</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Scanned By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm text-gray-600">
                                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="font-medium text-gray-900">{log.studentName}</div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-tight">{log.studentId}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="text-xs text-gray-600">
                                            <span className="opacity-70">Class:</span> {log.studentClass} | <span className="opacity-70">Loc:</span> {log.studentLocation}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.type === 'TRANSPORT' ? 'bg-indigo-100 text-indigo-700' : log.type === 'MEAL' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                         <span className={`px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${
                                             log.status === 'APPROVED' || log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 
                                             log.status === 'REPEATED' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                             }`}>
                                            {(log.status === 'APPROVED' || log.status === 'SUCCESS') ? <Check size={12}/> : (log.status === 'REPEATED' ? <AlertTriangle size={12}/> : <X size={12}/>)}
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-500">
                                        <div className="font-medium">{log.scannedByName || 'System'}</div>
                                        <div className="text-[10px] opacity-60">{log.scannedBy}</div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No logs found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// 3. Dashboard Component
const Dashboard = ({ students, changeTab }) => {
  const total = students.length;
  const transportPaid = students.filter(s => s.transport?.isPaid).length;
  const mealPaid = students.filter(s => s.meal?.isPaid).length;
  
  const transportPct = total > 0 ? Math.round((transportPaid / total) * 100) : 0;
  const mealPct = total > 0 ? Math.round((mealPaid / total) * 100) : 0;

  const StatCard = ({ title, count, icon: Icon, color, onClick }) => (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon className={color.replace('bg-', 'text-')} size={24} />
        </div>
        <ArrowRight className="text-gray-300 group-hover:text-gray-500 transition-colors" size={20} />
      </div>
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
      <p className="text-3xl font-bold text-gray-800 mt-1">{count}</p>
    </div>
  );

  const ProgressBar = ({ label, percentage, colorClass, bgClass }) => (
    <div className="mb-6">
        <div className="flex mb-2 items-center justify-between">
        <div>
            <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${colorClass} bg-opacity-20`}>
            {label}
            </span>
        </div>
        <div className="text-right">
            <span className={`text-xs font-semibold inline-block ${colorClass.replace('text-', '')}`}>
            {percentage}%
            </span>
        </div>
        </div>
        <div className={`overflow-hidden h-4 mb-4 text-xs flex rounded-full ${bgClass}`}>
        <div 
            style={{ width: `${percentage}%` }} 
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${colorClass.replace('text-', 'bg-')} transition-all duration-1000 ease-out`}
        ></div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500">Overview of current term payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Students" count={total} icon={Users} color="bg-blue-600" onClick={() => changeTab('STUDENTS')} />
        <StatCard title="Transport Paid" count={transportPaid} icon={Bus} color="bg-indigo-600" onClick={() => changeTab('STUDENTS')} />
        <StatCard title="Meals Paid" count={mealPaid} icon={Utensils} color="bg-orange-600" onClick={() => changeTab('STUDENTS')} />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Collection Progress</h3>
        <ProgressBar label="Transport" percentage={transportPct} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
        <ProgressBar label="Meals" percentage={mealPct} colorClass="text-orange-600" bgClass="bg-orange-100" />
      </div>
    </div>
  );
};

// 4. Student List Component
const StudentList = ({ students, role }) => {
  const isAdmin = role === 'ADMIN';
  const initialFilter = role === 'DRIVER' ? 'TRANSPORT_ONLY' : role === 'STAFF' ? 'MEAL_ONLY' : 'ALL';
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      let matchesFilter = true;
      if (role === 'DRIVER' && !s.transport?.isPaid) return false;
      if (role === 'STAFF' && !s.meal?.isPaid && !s.transport?.isPaid) return false;

      if (isAdmin) {
         if (filter === 'PAID') matchesFilter = s.transport?.isPaid && s.meal?.isPaid; 
         else if (filter === 'UNPAID') matchesFilter = !s.transport?.isPaid || !s.meal?.isPaid;
         else if (filter === 'TRANSPORT_ONLY') matchesFilter = s.transport?.isPaid;
         else if (filter === 'MEAL_ONLY') matchesFilter = s.meal?.isPaid;
      }
      
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        s.name.toLowerCase().includes(searchLower) ||
        s.className.toLowerCase().includes(searchLower) ||
        s.adminNumber.toLowerCase().includes(searchLower);
      return matchesFilter && matchesSearch;
    });
  }, [students, filter, search, role, isAdmin]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student record? This action cannot be undone.')) {
        await deleteStudent(id);
    }
  };

  const toggleExpand = (id) => {
    setExpandedStudentId(expandedStudentId === id ? null : id);
  };

  const handlePrint = () => {
    window.print();
  };

  const processCsvImport = async () => {
      if (!csvText.trim()) return;
      const lines = csvText.split('\n');
      const newStudents = [];
      let startIndex = 0;
      if (lines[0].toLowerCase().includes('name')) startIndex = 1;

      for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',').map(p => p.trim());
          if (parts.length < 5) continue;
          const isTrue = (val) => val && ['yes', 'true', 'paid'].includes(val.toLowerCase());
          
          // Map CSV: Name, Gender, Class, Location, Admin No, TransportPaid, MealPaid, ParentName, Contact, Relation, BusNo, BusName
          newStudents.push({
              name: parts[0],
              gender: parts[1],
              className: parts[2],
              dropLocation: parts[3],
              adminNumber: parts[4],
              transportPaid: isTrue(parts[5]),
              mealPaid: isTrue(parts[6]),
              parentName: parts[7] || '',
              parentContact: parts[8] || '',
              parentRelationship: parts[9] || 'Father',
              busNumber: parts[10] || '',
              busName: parts[11] || ''
          });
      }
      if (newStudents.length > 0) {
          const count = await bulkAddStudents(newStudents);
          alert(`Successfully imported ${count} unique students. Duplicates were skipped.`);
          setShowImportModal(false);
          setCsvText('');
      } else {
          alert("No valid student data found in text.");
      }
  };

  const exportPDF = async () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text('Student Payment Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 30);
    
    const filterName = isAdmin ? filter : (role === 'DRIVER' ? 'Transport Approved' : 'Meal Approved');
    doc.text(`Filter: ${filterName} | Total Records: ${filteredStudents.length}`, 14, 36);

    const studentsWithQR = await Promise.all(filteredStudents.map(async (s) => {
         try {
            const qrUrl = await QRCode.toDataURL(s.id, { margin: 1, width: 50 });
            return { ...s, qrUrl };
         } catch (e) {
            return { ...s, qrUrl: null };
         }
    }));

    const tableData = studentsWithQR.map(s => [
      s.name,
      s.gender || '-',
      s.className,
      s.dropLocation || '-',
      s.adminNumber,
      s.transport?.isPaid ? 'APPROVED' : 'NOT APPROVED',
      s.meal?.isPaid ? 'PAID' : 'UNPAID',
      '', 
      '[   ]'
    ]);

    autoTable(doc, {
      head: [['Name', 'Gender', 'Class', 'Location', 'Admin No.', 'Transport', 'Meals', 'QR Code', 'Verified']],
      body: tableData,
      startY: 44,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9, cellPadding: 2, minCellHeight: 15, valign: 'middle' },
      columnStyles: {
        7: { cellWidth: 15 },
        8: { halign: 'center', fontStyle: 'bold' }
      },
      didDrawCell: function(data) {
        if (data.column.index === 7 && data.cell.section === 'body') {
           const rowIndex = data.row.index;
           const imgUrl = studentsWithQR[rowIndex].qrUrl;
           if (imgUrl) {
               doc.addImage(imgUrl, 'PNG', data.cell.x + 1, data.cell.y + 1, 13, 13);
           }
        }
      }
    });

    doc.save('student-payments-qr.pdf');
  };

  const PaymentBadge = ({ isPaid, date }) => (
    <div className="flex flex-col items-center justify-center w-full">
         <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-bold border w-24 justify-center ${
            isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
            }`}>
            {isPaid ? <Check size={12} /> : <X size={12} />}
            <span>{isPaid ? 'APPROVED' : 'NOT APPROVED'}</span>
        </span>
         <div className="text-[10px] text-gray-400 mt-1">
            {isPaid && date ? format(new Date(date), 'MMM d') : '-'}
        </div>
    </div>
  );

  const PaymentToggle = ({ isPaid, onClick, date }) => (
    <div className="flex flex-col items-center">
        <button
            onClick={onClick}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all w-28 justify-center mb-1 ${
            isPaid ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
        >
            {isPaid ? <Check size={14} /> : <X size={14} />}
            <span>{isPaid ? 'APPROVED' : 'NOT APPROVED'}</span>
        </button>
        <div className="text-[10px] text-gray-400 flex items-center">
            {isPaid && date ? format(new Date(date), 'MMM d') : '-'}
        </div>
    </div>
  );

  const HistoryList = ({ history, type }) => (
    <div className="w-full">
        {history && history.length > 0 ? (
            <div className="max-h-40 overflow-y-auto pr-2">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 bg-gray-50 sticky top-0">
                        <tr>
                            <th className="py-2 text-left">Date</th>
                            <th className="py-2 text-left">Time</th>
                            <th className="py-2 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.slice().reverse().map((record, idx) => (
                            <tr key={idx}>
                                <td className="py-2 text-gray-700">{format(new Date(record.date), 'MMM d, yyyy')}</td>
                                <td className="py-2 text-gray-500 font-mono text-xs">{format(new Date(record.date), 'h:mm a')}</td>
                                <td className="py-2 text-right text-green-600 font-medium text-xs">Paid</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="text-center py-4 text-gray-400 italic text-sm">No payment history recorded</div>
        )}
    </div>
  );

  return (
    <div className="space-y-6 print-full-width">
      {showImportModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Import Students from CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="mb-4 bg-blue-50 p-4 rounded text-xs text-blue-800">
              <p className="font-bold mb-1">Expected Format (12 Columns):</p>
              <p className="font-mono">Name, Gender, Class, DropLocation, AdminNo, TransportPaid(Y/N), MealPaid(Y/N), ParentName, ParentContact, Relationship, BusNo, BusName</p>
            </div>
            <textarea 
              className="w-full h-64 border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Paste your CSV data here..."
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            ></textarea>
            <div className="mt-4 flex justify-end space-x-3">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={processCsvImport} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">Process Import</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
              {role === 'DRIVER' ? 'Approved Passengers' : role === 'STAFF' ? 'Meal & Transport List' : 'Student Records'}
          </h2>
          <p className="text-gray-500">
             {!isAdmin 
               ? `View only list of ${role === 'DRIVER' ? 'transport' : 'meal/transport'} approved students.` 
               : "Manage Transport and Meal payments"}
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
            {isAdmin && (
                <button 
                    onClick={() => setShowImportModal(true)} 
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                    <Upload size={18} />
                    <span>Import CSV</span>
                </button>
            )}
            <button onClick={handlePrint} className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <Printer size={18} />
                <span>Print List</span>
            </button>
            <button onClick={exportPDF} className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors shadow-sm">
                <Download size={18} />
                <span>Export PDF w/ QR</span>
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Name, Class, or Admin No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        {isAdmin && (
            <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-200 overflow-x-auto">
            {['ALL', 'PAID', 'UNPAID', 'TRANSPORT_ONLY', 'MEAL_ONLY'].map((f) => (
                <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filter === f ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                {f === 'PAID' ? 'Fully Paid' : f === 'UNPAID' ? 'Pending' : f === 'TRANSPORT_ONLY' ? 'Transport Approved' : f === 'MEAL_ONLY' ? 'Meals Approved' : 'All Students'}
                </button>
            ))}
            </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-full-width">
        <div className="overflow-x-auto print-visible">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Admin No.</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bus</th>
                
                {(isAdmin || role === 'DRIVER' || role === 'STAFF') && (
                     <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">
                        <div className="flex items-center justify-center space-x-1"><Bus size={14}/><span>Transport</span></div>
                    </th>
                )}
                
                {(isAdmin || role === 'STAFF') && (
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">
                        <div className="flex items-center justify-center space-x-1"><Utensils size={14}/><span>Meals</span></div>
                    </th>
                )}

                {isAdmin && (
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right actions-col">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <React.Fragment key={student.id}>
                    <tr className={`hover:bg-gray-50 transition-colors group ${expandedStudentId === student.id ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{student.name}</div><div className="text-xs text-gray-500">{student.gender}</div></td>
                    <td className="px-6 py-4 text-gray-600">{student.className}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-500">{student.adminNumber}</td>
                    <td className="px-6 py-4"><div className="text-sm font-bold text-indigo-700">{student.busNumber || '-'}</div><div className="text-[10px] text-gray-400">{student.busName || ''}</div></td>
                    
                    {(isAdmin || role === 'DRIVER' || role === 'STAFF') && (
                         <td className="px-6 py-4 text-center">
                            {!isAdmin ? (
                                <PaymentBadge 
                                    isPaid={student.transport?.isPaid} 
                                    date={student.transport?.lastPaymentDate}
                                />
                            ) : (
                                <PaymentToggle 
                                    isPaid={student.transport?.isPaid} 
                                    date={student.transport?.lastPaymentDate}
                                    onClick={() => toggleStudentPayment(student, 'transport', !student.transport?.isPaid)}
                                />
                            )}
                        </td>
                    )}

                    {(isAdmin || role === 'STAFF') && (
                         <td className="px-6 py-4 text-center">
                            {!isAdmin ? (
                                <PaymentBadge 
                                    isPaid={student.meal?.isPaid} 
                                    date={student.meal?.lastPaymentDate}
                                />
                            ) : (
                                <PaymentToggle 
                                    isPaid={student.meal?.isPaid} 
                                    date={student.meal?.lastPaymentDate}
                                    onClick={() => toggleStudentPayment(student, 'meal', !student.meal?.isPaid)}
                                />
                            )}
                        </td>
                    )}

                    {isAdmin && (
                        <td className="px-6 py-4 text-right actions-col">
                            <div className="flex items-center justify-end space-x-2">
                                <button onClick={() => toggleExpand(student.id)} className={`p-2 rounded-lg transition-colors ${expandedStudentId === student.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                                    {expandedStudentId === student.id ? <ChevronUp size={18} /> : <History size={18} />}
                                </button>
                                <button onClick={() => handleDelete(student.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </td>
                    )}
                    </tr>
                    {expandedStudentId === student.id && (
                        <tr className="bg-gray-50/50 no-print">
                            <td colSpan={10} className="px-6 py-4 border-b border-gray-100 shadow-inner">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                    {/* Parent Info */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center pb-2 border-b border-gray-100">
                                            <User size={16} className="text-blue-600 mr-2"/> Parent / Guardian Info
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-gray-400">Name:</span> <strong>{student.parentName || 'N/A'}</strong></p>
                                            <p><span className="text-gray-400">Contact:</span> <strong>{student.parentContact || 'N/A'}</strong></p>
                                            <p><span className="text-gray-400">Relation:</span> <strong>{student.parentRelationship || 'N/A'}</strong></p>
                                            <p><span className="text-gray-400">Drop Loc:</span> <strong>{student.dropLocation || 'N/A'}</strong></p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center pb-2 border-b border-gray-100">
                                            <Bus size={16} className="text-indigo-600 mr-2"/> Transport Payment History
                                        </h4>
                                        <HistoryList history={student.transport?.history} type="Transport" />
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center pb-2 border-b border-gray-100">
                                            <Utensils size={16} className="text-orange-600 mr-2"/> Meal Payment History
                                        </h4>
                                        <HistoryList history={student.meal?.history} type="Meals" />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )}
                </React.Fragment>
              )) : (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-500">No students found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 5. Add Student Component
const AddStudent = ({ onSuccess }) => {
  const [formData, setFormData] = useState({ 
    name: '', className: '', adminNumber: '', gender: 'Male', dropLocation: '',
    parentName: '', parentContact: '', parentRelationship: 'Father',
    busNumber: '', busName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await addStudent(formData);
      setFormData({ 
        name: '', className: '', adminNumber: '', gender: 'Male', dropLocation: '',
        parentName: '', parentContact: '', parentRelationship: 'Father',
        busNumber: '', busName: ''
      });
      onSuccess();
    } catch (error) {
      setError(error.message || "Error adding student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Register Student</h2>
        <p className="text-gray-500">Add a new student to the payment system</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-center gap-2">
            <AlertCircle size={20} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary border-b pb-4">
                <User size={20}/> Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. John Doe" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class / Grade</label>
                    <input type="text" required value={formData.className} onChange={e => setFormData({ ...formData, className: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. 10-A" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Administration No.</label>
                    <input type="text" required value={formData.adminNumber} onChange={e => setFormData({ ...formData, adminNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. ADM-2024-001" />
                </div>
                <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Point</label>
                    <input type="text" value={formData.dropLocation} onChange={e => setFormData({ ...formData, dropLocation: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Main Gate" />
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-success border-b pb-4">
                <Shield size={20}/> Parent / Guardian Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                    <input type="text" required value={formData.parentName} onChange={e => setFormData({ ...formData, parentName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success outline-none" placeholder="Full Name" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                    <input type="tel" required value={formData.parentContact} onChange={e => setFormData({ ...formData, parentContact: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success outline-none" placeholder="+254..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select value={formData.parentRelationship} onChange={e => setFormData({ ...formData, parentRelationship: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success outline-none bg-white">
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-indigo-600 border-b pb-4">
                <Bus size={20}/> Transport Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bus Number (Identifier)</label>
                    <input type="text" value={formData.busNumber} onChange={e => setFormData({ ...formData, busNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. BUS-01" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bus Route / Name</label>
                    <input type="text" value={formData.busName} onChange={e => setFormData({ ...formData, busName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Westside Express" />
                </div>
            </div>
        </div>

        <div className="pt-4 flex justify-end">
            <button type="submit" disabled={loading} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg flex items-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
                {loading ? 'Saving Student...' : 'Register Student'}
            </button>
        </div>
      </form>
    </div>
  );
};

// 6. Settings Component
const Settings = ({ user }) => {
  const [termDate, setTermDate] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState(null);
  
  // User Management State
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'STAFF', assignedBusNumber: '' });
  const [showUserForm, setShowUserForm] = useState(false);

  useEffect(() => {
    getAppSettings().then(settings => {
      if (settings.termEndDate) setTermDate(new Date(settings.termEndDate).toISOString().split('T')[0]);
    });
    setUsers(getStoredData(STORAGE_KEYS.USERS, []));
  }, []);

  const handleUserAdd = async (e) => {
      e.preventDefault();
      try {
          await addUser(newUser);
          setUsers(getStoredData(STORAGE_KEYS.USERS, []));
          setNewUser({ name: '', email: '', password: '', role: 'STAFF', assignedBusNumber: '' });
          setShowUserForm(false);
          setMsg({ type: 'success', text: 'User added successfully' });
      } catch(e) {
          setMsg({ type: 'error', text: e.message });
      }
  };

  const handleUserDelete = (uid) => {
      if(uid === user.uid) return alert("Cannot delete yourself.");
      if(confirm("Delete this user?")) {
          removeUser(uid);
          setUsers(getStoredData(STORAGE_KEYS.USERS, []));
      }
  };

  const handleDateSave = async () => {
    try {
      const date = new Date(termDate);
      date.setHours(23, 59, 59, 999);
      await updateAppSettings({ termEndDate: date.toISOString(), termResetProcessed: false });
      setMsg({ type: 'success', text: 'Term date updated.' });
    } catch (e) { setMsg({ type: 'error', text: 'Error updating date.' }); }
  };

  const handleRegenerateQR = async () => {
      if (confirm("Regenerate ALL QR codes? Old codes will stop working.")) {
          await regenerateAllQrCodes();
          setMsg({ type: 'success', text: 'QR codes regenerated.' });
      }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div><h2 className="text-2xl font-bold text-gray-800">System Settings</h2></div>
      {msg && (<div className={`p-4 rounded-lg flex items-center ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>)}
      
      {/* User Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-center mb-6">
             <div className="flex items-center">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mr-4"><Users size={24} /></div>
                <h3 className="text-lg font-bold text-gray-800">User Management</h3>
             </div>
             <button onClick={() => setShowUserForm(!showUserForm)} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
                {showUserForm ? 'Cancel' : 'Add Staff'}
             </button>
        </div>
        
        {showUserForm && (
            <form onSubmit={handleUserAdd} className="mb-6 bg-gray-50 p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200">
                <div className="md:col-span-2 text-xs font-bold text-gray-400 uppercase mb-2">Login Credentials</div>
                <input type="text" placeholder="Full Name" required className="p-2 border rounded" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} />
                <input type="email" placeholder="Email (Username)" required className="p-2 border rounded" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} />
                <input type="password" placeholder="Password" required className="p-2 border rounded" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} />
                <select className="p-2 border rounded" value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}>
                    <option value="STAFF">Staff Member</option>
                    <option value="ADMIN">Administrator</option>
                </select>

                <div className="md:col-span-2 mt-4 text-xs font-bold text-indigo-400 uppercase mb-2">Service Configuration (Staff Only)</div>
                <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Assigned Bus Number (Optional - Set if staff is for Transport)</label>
                    <input type="text" placeholder="e.g. BUS-01" className="p-2 border rounded w-full" value={newUser.assignedBusNumber} onChange={e=>setNewUser({...newUser, assignedBusNumber: e.target.value})} />
                    <p className="text-[10px] text-gray-400 mt-1 italic">* Staff without an assigned bus will handle Meal Scanning only.</p>
                </div>

                <button type="submit" className="md:col-span-2 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 font-bold shadow-lg transition mt-4">Create System User</button>
            </form>
        )}

        <div className="space-y-2">
            {users.map(u => (
                <div key={u.uid} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                    <div>
                        <p className="font-bold text-sm">{u.name} <span className={`text-[10px] uppercase px-2 py-0.5 rounded ml-2 ${u.role === 'ADMIN' ? 'bg-slate-800 text-white' : 'bg-indigo-100 text-indigo-700'}`}>{u.role}</span></p>
                        <p className="text-xs text-gray-400">{u.email} {u.assignedBusNumber && <span className="text-blue-600 font-bold ml-2">• Assigned to {u.assignedBusNumber}</span>}</p>
                    </div>
                    {u.uid !== user.uid && (
                        <button onClick={() => handleUserDelete(u.uid)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Term Date */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center mb-4">
            <Calendar className="text-purple-600 mr-4" size={24} />
            <h3 className="text-lg font-bold">Term End Date</h3>
        </div>
        <div className="flex gap-4">
          <input type="date" value={termDate} onChange={(e) => setTermDate(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" />
          <button onClick={handleDateSave} className="px-6 py-2 bg-gray-800 text-white rounded-lg">Update</button>
        </div>
      </div>
      
       {/* Danger Zone */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
             <h3 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h3>
             <button onClick={handleRegenerateQR} className="w-full px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Regenerate All QR Codes</button>
       </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('DASHBOARD');
  const [students, setStudents] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [termResetNotification, setTermResetNotification] = useState(false);

  useEffect(() => {
    const currentUser = mockAuth.getCurrentUser();
    if (currentUser) setUserProfile(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    
    // Auto-navigate based on role
    if (userProfile.role === 'STAFF' || userProfile.role === 'DRIVER') {
        if (currentTab === 'DASHBOARD' || currentTab === 'SETTINGS' || currentTab === 'ADD_STUDENT' || currentTab === 'HISTORY') {
            setCurrentTab('STUDENTS');
        }
    }

    checkAndResetTerm().then((didReset) => {
      if (didReset && userProfile.role === 'ADMIN') setTermResetNotification(true);
    });

    setStudents(getStoredData(STORAGE_KEYS.STUDENTS, []).sort((a,b) => a.name.localeCompare(b.name)));

    const unsubscribe = subscribeToData(STORAGE_KEYS.STUDENTS, (newStudents) => {
        if (newStudents) setStudents(newStudents.sort((a,b) => a.name.localeCompare(b.name)));
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleLogout = async () => {
    await mockAuth.signOut();
    setUserProfile(null);
    setCurrentTab('DASHBOARD');
  };

  const handleLoginSuccess = (profile) => {
    const extendedProfile = { ...profile };
    setStoredData(STORAGE_KEYS.USER_SESSION, extendedProfile);
    setUserProfile(extendedProfile);
  };

  const NavItem = ({ tab, icon: Icon, label }) => (
    <button
      onClick={() => { setCurrentTab(tab); setIsMobileMenuOpen(false); }}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors duration-200 ${currentTab === tab ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  if (!userProfile) return <Auth onLoginSuccess={handleLoginSuccess} />;

  const isAdmin = userProfile.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 no-print">
        <h1 className="text-xl font-bold text-primary">EduPay</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-64 bg-white shadow-xl z-30 flex flex-col`}>
        <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg ${isAdmin ? 'bg-slate-800' : 'bg-primary'}`}>
            {userProfile.role[0]}
          </div>
          <span className="text-2xl font-bold text-gray-800">EduPay</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {isAdmin && <NavItem tab="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />}
          <NavItem tab="STUDENTS" icon={Users} label={isAdmin ? "Students" : "List"} />
          {isAdmin && <NavItem tab="ADD_STUDENT" icon={UserPlus} label="Add Student" />}
          {isAdmin && <NavItem tab="HISTORY" icon={List} label="Reports / Logs" />}
          {isAdmin && <NavItem tab="SETTINGS" icon={SettingsIcon} label="Settings" />}
          <NavItem tab="SCANNER" icon={ScanLine} label="QR Scanner" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="mb-4 px-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Logged in as</p>
            <p className="text-sm font-medium text-gray-700 truncate">{userProfile.name}</p>
            <p className="text-xs text-blue-500 font-semibold mt-1">
                {userProfile.role} {userProfile.assignedBusNumber ? `• ${userProfile.assignedBusNumber}` : ''}
            </p>
          </div>
          <button onClick={handleLogout} className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-danger hover:bg-red-50 transition-colors"><LogOut size={20} /><span className="font-medium">Sign Out</span></button>
        </div>
      </aside>

      {isMobileMenuOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>)}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">
          {termResetNotification && isAdmin && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm flex justify-between items-center no-print">
              <div className="flex"><div className="flex-shrink-0"><AlertCircle className="h-5 w-5 text-yellow-400" /></div><div className="ml-3"><p className="text-sm text-yellow-700">The term has ended. All student payment statuses have been automatically reset to <strong>Unpaid</strong>.</p></div></div>
              <button onClick={() => setTermResetNotification(false)} className="text-yellow-700 hover:text-yellow-900"><X size={20} /></button>
            </div>
          )}
          {currentTab === 'DASHBOARD' && isAdmin && <Dashboard students={students} changeTab={setCurrentTab} />}
          {currentTab === 'STUDENTS' && <StudentList students={students} role={userProfile.role} />}
          {currentTab === 'ADD_STUDENT' && isAdmin && <AddStudent onSuccess={() => setCurrentTab('STUDENTS')} />}
          {currentTab === 'HISTORY' && isAdmin && <ScanHistory />}
          {currentTab === 'SETTINGS' && isAdmin && <Settings user={userProfile} />}
          {currentTab === 'SCANNER' && <Scanner students={students} currentUser={userProfile} onClose={() => setCurrentTab('STUDENTS')} />}
          
          {!isAdmin && !['STUDENTS', 'SCANNER'].includes(currentTab) && (
            <div className="text-center mt-20">
                <AlertTriangle className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-700">Access Restricted</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
