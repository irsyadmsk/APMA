import React, { useState, useEffect, useRef } from 'react';
import { 
    AppFormData, 
    KBC_DATA, 
    FASE_MAPPING, 
    JENJANG_OPTIONS, 
    FASE_DESCRIPTIONS, 
    ModuleBlock, 
    SchoolProfile, 
    DocumentDesign, 
    VersionHistoryItem 
} from './types';
import { 
    handleFileUpload, 
    assemblePrompt, 
    exportToDOCX, 
    exportToHTML, 
    exportToMarkdown, 
    exportToODT, 
    replaceRegulatoryTerms, 
    getThemeStyles, 
    parseGeneratedBlocks,
    REGULATORY_GLOSSARY
} from './utils';
import { 
    generateModulAjar, 
    generatePartialBlock, 
    analyzeModulAjar,
    getApiKey
} from './services/geminiService';

// Standalone Document Print Helper
const printDocument = (blocks: ModuleBlock[], design: DocumentDesign, schoolProfile?: SchoolProfile, formData?: AppFormData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const { fontFamily, theme, primaryColor, secondaryColor, marginSize, headerText, footerText, showCover, useIcons, showPageNumbers } = design;
    
    let schoolHeader = '';
    if (schoolProfile && (schoolProfile.namaSekolah || schoolProfile.logoUrl)) {
        schoolHeader = `
            <div style="display: flex; align-items: center; justify-content: center; border-bottom: 3px double ${primaryColor}; padding-bottom: 12px; margin-bottom: 24px;">
                ${schoolProfile.logoUrl ? `<img src="${schoolProfile.logoUrl}" style="height: 70px; margin-right: 16px; object-fit: contain;" />` : ''}
                <div style="text-align: center;">
                    <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; color: ${primaryColor}; border: none; border-bottom: none; margin-top: 0; padding-bottom: 0;">${schoolProfile.namaSekolah}</h2>
                    <p style="margin: 4px 0 0 0; font-size: 10pt; color: #334155;">${schoolProfile.alamat || ''}</p>
                    <p style="margin: 2px 0 0 0; font-size: 9pt; color: #64748b;">NPSN: ${schoolProfile.npsn || '-'} | NSS: ${schoolProfile.nss || '-'}</p>
                </div>
            </div>
        `;
    }

    // Cover Page Design
    let coverPage = '';
    if (showCover) {
        let coverCSS = '';
        switch (theme) {
            case 'formal':
                coverCSS = `border: 4px double ${primaryColor}; padding: 50px 40px; margin: 10px; height: calc(100% - 20px);`;
                break;
            case 'islami':
                coverCSS = `border-top: 15px solid ${primaryColor}; border-bottom: 15px solid ${primaryColor}; border-left: 3px solid ${secondaryColor}; border-right: 3px solid ${secondaryColor}; padding: 50px 40px; height: 100%; background-color: #fcfbf7;`;
                break;
            case 'colorful':
                coverCSS = `border: 3px solid ${primaryColor}; border-radius: 24px; background: linear-gradient(135deg, #faf5ff, #fff5f5); padding: 50px 40px; height: 100%;`;
                break;
            case 'modern':
                coverCSS = `border-left: 10px solid ${primaryColor}; padding: 60px 40px; height: 100%; background-color: #f8fafc;`;
                break;
            case 'minimalis':
            default:
                coverCSS = `padding: 60px 40px; height: 100%;`;
                break;
        }

        coverPage = `
            <div class="page-container" style="height: 100vh; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; box-sizing: border-box; page-break-after: always; padding: 20px;">
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; ${coverCSS}">
                    <div>
                        ${schoolProfile?.logoUrl ? `<img src="${schoolProfile.logoUrl}" style="height: 90px; margin-bottom: 20px; object-fit: contain; display: block; margin-left: auto; margin-right: auto;" />` : ''}
                        <h3 style="margin: 0; font-size: 12pt; font-weight: bold; color: ${secondaryColor}; letter-spacing: 2px; border-bottom: none; text-align: center; text-transform: uppercase; margin-top: 0; padding-bottom: 0;">DOKUMEN PERENCANAAN PEMBELAJARAN</h3>
                    </div>
                    <div style="margin: 40px 0;">
                        <h1 style="margin: 0; font-size: 24pt; font-weight: 800; line-height: 1.3; color: ${primaryColor}; text-align: center; border-bottom: none;">MODUL AJAR</h1>
                        <h2 style="margin: 10px 0 0 0; font-size: 14pt; font-weight: 600; color: #475569; text-align: center;">MATA PELAJARAN: ${(formData?.mapel || schoolProfile?.namaSekolah || 'KEMENTERIAN PENDIDIKAN').toUpperCase()}</h2>
                        <div style="margin-top: 15px; font-size: 11pt; color: #64748b; font-weight: 500;">
                            Fase ${formData?.fase || '-'} / Kelas ${formData?.kelas || '-'}
                        </div>
                    </div>
                    <div style="font-size: 10pt; border-top: 1px solid #e2e8f0; width: 100%; padding-top: 20px; display: flex; justify-content: space-around; text-align: left;">
                        <div>
                            <strong>Penyusun:</strong><br/>
                            ${schoolProfile?.namaGuru || formData?.namaGuru || 'Pendidik'}
                        </div>
                        <div>
                            <strong>Institusi:</strong><br/>
                            ${schoolProfile?.namaSekolah || formData?.institusi || 'Institusi Pendidik'}
                        </div>
                        <div>
                            <strong>Tahun Ajaran:</strong><br/>
                            ${formData?.tahun || '2025/2026'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Icon helper
    const getIconForBlock = (title: string) => {
        if (!useIcons) return '';
        const lower = title.toLowerCase();
        if (lower.includes('identitas') || lower.includes('informasi umum')) return '📋 ';
        if (lower.includes('tujuan') || lower.includes('kktp')) return '🎯 ';
        if (lower.includes('pemahaman') || lower.includes('pemantik')) return '💡 ';
        if (lower.includes('asesmen') || lower.includes('rencana')) return '📊 ';
        if (lower.includes('kegiatan')) return '🚶‍♂️ ';
        if (lower.includes('refleksi')) return '🔄 ';
        if (lower.includes('lkpd') || lower.includes('lembar kerja')) return '📝 ';
        if (lower.includes('rubrik')) return '📐 ';
        if (lower.includes('kisi-kisi') || lower.includes('soal')) return '✏️ ';
        if (lower.includes('pengayaan') || lower.includes('remedial')) return '🚀 ';
        if (lower.includes('bacaan') || lower.includes('media')) return '📚 ';
        if (lower.includes('glosarium') || lower.includes('daftar pustaka') || lower.includes('pustaka')) return '📖 ';
        return '🔹 ';
    };

    const marked = (window as any).marked;
    let hasShownInformasiUmum = false;
    let hasShownKomponenInti = false;
    let hasShownLampiran = false;

    const bodyContent = blocks.map((b, idx) => {
        let chapterPrefix = '';
        const cat = b.category || '';
        
        if (cat.includes('Informasi Umum') && !hasShownInformasiUmum) {
            hasShownInformasiUmum = true;
            chapterPrefix = `
                <div class="chapter-header" style="margin-top: 15px; margin-bottom: 20px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px;">
                    <h2 style="font-size: 14pt; font-weight: bold; color: ${primaryColor}; margin: 0; text-transform: uppercase; border-bottom: none; text-align: left; padding: 0;">BAB I: INFORMASI UMUM</h2>
                </div>
            `;
        } else if (cat.includes('Komponen Inti') && !hasShownKomponenInti) {
            hasShownKomponenInti = true;
            chapterPrefix = `
                <div class="chapter-header" style="page-break-before: always; margin-top: 25px; margin-bottom: 20px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px;">
                    <h2 style="font-size: 14pt; font-weight: bold; color: ${primaryColor}; margin: 0; text-transform: uppercase; border-bottom: none; text-align: left; padding: 0;">BAB II: KOMPONEN INTI</h2>
                </div>
            `;
        } else if (cat.includes('Lampiran') && !hasShownLampiran) {
            hasShownLampiran = true;
            chapterPrefix = `
                <div class="chapter-header" style="page-break-before: always; margin-top: 25px; margin-bottom: 20px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px;">
                    <h2 style="font-size: 14pt; font-weight: bold; color: ${primaryColor}; margin: 0; text-transform: uppercase; border-bottom: none; text-align: left; padding: 0;">BAB III: LAMPIRAN</h2>
                </div>
            `;
        }

        return `
            ${chapterPrefix}
            <div class="block-section">
                <h3>${getIconForBlock(b.title)}${b.title}</h3>
                <div>${marked ? marked.parse(b.content) : b.content}</div>
            </div>
        `;
    }).join('\n');

    // Page Margin configuration
    let marginCSS = 'margin: 20mm;';
    if (marginSize === 'narrow') marginCSS = 'margin: 12mm;';
    if (marginSize === 'wide') marginCSS = 'margin: 35mm;';

    // Theme Accent CSS Injection
    let themeAccentCSS = '';
    let tableHeaderCSS = '';
    switch (theme) {
        case 'formal':
            themeAccentCSS = `
                h3 { color: ${primaryColor}; border-bottom: 3px double ${primaryColor}; padding-bottom: 4px; }
                .block-section { border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 20px; background-color: #ffffff; }
            `;
            tableHeaderCSS = `th { background-color: #f1f5f9; color: #1e293b; border: 1px solid #94a3b8; }`;
            break;
        case 'minimalis':
            themeAccentCSS = `
                h3 { color: #000000; border-bottom: 1px solid #000000; padding-bottom: 4px; }
                .block-section { margin-bottom: 25px; }
            `;
            tableHeaderCSS = `th { background-color: #ffffff; color: #000000; border: 1px solid #000000; }`;
            break;
        case 'modern':
            themeAccentCSS = `
                h3 { color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; padding-bottom: 6px; }
                .block-section { border-left: 4px solid ${primaryColor}; padding-left: 15px; margin-bottom: 25px; }
            `;
            tableHeaderCSS = `th { background-color: ${primaryColor}; color: #ffffff; border: 1px solid #cbd5e1; }`;
            break;
        case 'islami':
            themeAccentCSS = `
                h3 { color: ${primaryColor}; border-bottom: 2px solid ${secondaryColor}; padding-bottom: 6px; }
                .block-section { border-top: 3px solid ${primaryColor}; border-bottom: 1px solid ${secondaryColor}; padding: 15px 0; margin-bottom: 25px; }
            `;
            tableHeaderCSS = `th { background-color: ${primaryColor}; color: #ffffff; border: 1px solid #cbd5e1; }`;
            break;
        case 'colorful':
            themeAccentCSS = `
                h3 { color: ${primaryColor}; border-bottom: 2.5px dashed ${secondaryColor}; padding-bottom: 6px; }
                .block-section { background-color: #faf5ff; border: 1.5px solid ${primaryColor}; border-radius: 12px; padding: 15px; margin-bottom: 25px; }
            `;
            tableHeaderCSS = `th { background-color: ${primaryColor}; color: #ffffff; border: 1px solid #f3e8ff; }`;
            break;
        case 'mono':
        default:
            themeAccentCSS = `
                h3 { color: #000000; border-bottom: 2px solid #000000; padding-bottom: 4px; }
                .block-section { border: 1px solid #000000; padding: 15px; margin-bottom: 20px; }
            `;
            tableHeaderCSS = `th { background-color: #f3f4f6; color: #000000; border: 1px solid #000000; }`;
            break;
    }

    const docContent = `
        <html>
            <head>
                <title>Modul Ajar - ${formData?.materi || 'Generated'}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Courier+Prime&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: A4;
                        ${marginCSS}
                    }
                    @media print {
                        body { 
                            background: white; 
                            color: black; 
                            font-size: 11pt; 
                            margin-top: ${headerText ? '35px' : '0px'};
                            margin-bottom: ${showPageNumbers || footerText ? '35px' : '0px'};
                        }
                        .no-print { display: none; }
                        
                        /* Header and Footer printing styles */
                        .print-header {
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            height: 20px;
                            font-size: 8pt;
                            color: #64748b;
                            border-bottom: 1px solid #e2e8f0;
                            text-align: center;
                            line-height: 1.5;
                        }
                        .print-footer {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            height: 20px;
                            font-size: 8pt;
                            color: #64748b;
                            border-top: 1px solid #e2e8f0;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            line-height: 1.5;
                        }
                        .print-footer-num::after {
                            content: "Halaman " counter(page);
                        }
                        .page-container {
                            page-break-after: always;
                            height: 98%;
                        }
                    }
                    body {
                        font-family: ${fontFamily === 'serif' ? 'Lora, serif' : (fontFamily === 'mono' ? 'Courier Prime, monospace' : 'Inter, sans-serif')};
                        line-height: 1.6;
                        color: #1e293b;
                        padding: 10px;
                        max-width: 850px;
                        margin: 0 auto;
                    }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: avoid; border-radius: 8px; overflow: hidden; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; vertical-align: top; }
                    th { font-weight: bold; }
                    tr:nth-child(even) { background-color: rgba(0, 0, 0, 0.015); }
                    td:first-child { font-weight: 600; }
                    h1 { font-size: 22pt; font-weight: bold; text-align: center; margin-bottom: 5px; }
                    h2 { font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 25px; }
                    h3 { font-size: 13pt; font-weight: bold; margin-top: 25px; margin-bottom: 10px; page-break-after: avoid; }
                    h4 { font-size: 11pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; page-break-after: avoid; }
                    ul, ol { padding-left: 20px; margin-top: 5px; }
                    li { margin-bottom: 4px; }
                    p { margin-top: 5px; margin-bottom: 10px; }
                    .block-section { page-break-inside: avoid; margin-bottom: 20px; }
                    
                    /* Theme CSS */
                    ${themeAccentCSS}
                    ${tableHeaderCSS}
                </style>
            </head>
            <body>
                ${headerText ? `<div class="print-header">${headerText}</div>` : ''}
                ${showPageNumbers || footerText ? `
                <div class="print-footer">
                    <span>${footerText || ''}</span>
                    ${showPageNumbers ? `<span class="print-footer-num"></span>` : ''}
                </div>
                ` : ''}
                
                ${coverPage}
                ${schoolHeader}
                ${bodyContent}
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
        </html>
    `;
    printWindow.document.write(docContent);
    printWindow.document.close();
};

// Input Wrapper Component
const InputWrapper: React.FC<{
    label?: string;
    id?: string;
    children: React.ReactNode;
    errorMsg?: string;
    showError: boolean;
    className?: string;
}> = ({ label, id, children, errorMsg = "Harap isi kolom ini", showError, className = "" }) => {
    return (
        <div className={`relative ${className}`}>
            {label && <label htmlFor={id} className="block text-[10px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wider mb-1.5">{label}</label>}
            {children}
            {showError && (
                <div className="validation-bubble" style={{ display: 'block' }}>{errorMsg}</div>
            )}
        </div>
    );
};

export default function App() {
    // Basic Form States
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<AppFormData>({
        namaGuru: '',
        institusi: '',
        tahun: '2025/2026',
        jenjang: '',
        kelas: '',
        fase: '',
        semester: 'Ganjil',
        mapel: '',
        elemen: '',
        cp: '',
        materi: '',
        jumlahPertemuan: 1,
        lamaWaktu: '2 x 40 menit',
        model: '',
        pendekatan: 'Deep Learning (Pembelajaran Mendalam)',
        metode: 'Diskusi, Tanya Jawab, Penugasan Mandiri',
        strategi: 'Pembelajaran Berdiferensiasi',
        media: 'Slide PPT, Gambar Konseptual, Quizizz',
        sumberBelajar: 'Buku Guru Kurikulum Merdeka Kemendikdasmen',
        karakteristikMurid: 'Siswa reguler dengan beragam gaya belajar',
        kesiapanBelajar: 'Siswa secara umum telah menguasai prasyarat dasar materi ini',
        saranaPrasarana: 'Proyektor, Laptop, Akses Internet, Papan Tulis',
        isDaring: false,
        topikPancaCinta: [],
        materiInsersi: [],
        profilLulusan: [],
        uploadedText: null,
        uploadedImage: null
    });

    // Custom school profile states
    const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>({
        namaSekolah: '',
        alamat: '',
        npsn: '',
        nss: '',
        kepalaSekolah: '',
        namaGuru: ''
    });

    // Custom design configuration states
    const [documentDesign, setDocumentDesign] = useState<DocumentDesign>({
        theme: 'modern',
        primaryColor: '#059669',
        secondaryColor: '#0d9488',
        fontFamily: 'sans-serif',
        marginSize: 'normal',
        headerText: 'DOKUMEN MODUL AJAR',
        footerText: 'Dibuat Otomatis dengan APMA',
        showCover: true,
        useIcons: true,
        showPageNumbers: true
    });

    // Blocks & AI Audit States
    const [blocks, setBlocks] = useState<ModuleBlock[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [isEditingBlock, setIsEditingBlock] = useState(false);
    const [editingContent, setEditingContent] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);

    // Version Control States
    const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
    const [undoStack, setUndoStack] = useState<ModuleBlock[][]>([]);
    const [redoStack, setRedoStack] = useState<ModuleBlock[][]>([]);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [compareVersion, setCompareVersion] = useState<VersionHistoryItem | null>(null);

    // Form & UI States
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [fileStatus, setFileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [fileName, setFileName] = useState('');
    const [activeTab, setActiveTab] = useState<'outline' | 'copilot' | 'checker' | 'design' | 'school'>('outline');

    // Partial Generator states
    const [generatorType, setGeneratorType] = useState('LKPD');
    const [generatorInstructions, setGeneratorInstructions] = useState('');
    const [isGeneratingPartial, setIsGeneratingPartial] = useState(false);

    const progressIntervalRef = useRef<any>(null);

    const [hasApiKey, setHasApiKey] = useState(true);
    const [customApiKey, setCustomApiKey] = useState('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // Dark Mode States
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const localDark = localStorage.getItem('APMA_DARK_MODE');
            return localDark === 'true';
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('APMA_DARK_MODE', String(darkMode));
    }, [darkMode]);

    useEffect(() => {
        const key = getApiKey();
        setHasApiKey(!!key);
        setCustomApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    }, [step]);

    // Initialize localStorage profile on mount
    useEffect(() => {
        const savedSchool = localStorage.getItem('apma_school_profile');
        if (savedSchool) {
            try {
                const parsed = JSON.parse(savedSchool);
                setSchoolProfile(parsed);
                setFormData(prev => ({
                    ...prev,
                    namaGuru: prev.namaGuru || parsed.namaGuru || '',
                    institusi: prev.institusi || parsed.namaSekolah || ''
                }));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const saveSchoolProfile = (profile: SchoolProfile) => {
        setSchoolProfile(profile);
        localStorage.setItem('apma_school_profile', JSON.stringify(profile));
    };

    const updateForm = (key: keyof AppFormData, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: false }));
        }
    };

    const toggleCheckbox = (key: 'topikPancaCinta' | 'materiInsersi' | 'profilLulusan', value: string) => {
        setFormData(prev => {
            const list = prev[key];
            if (list.includes(value)) {
                return { ...prev, [key]: list.filter(item => item !== value) };
            } else {
                return { ...prev, [key]: [...list, value] };
            }
        });
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: false }));
        }
    };

    const validateStep = (currentStep: number) => {
        const newErrors: Record<string, boolean> = {};
        let isValid = true;
        let firstErrorId = '';

        if (currentStep === 1) {
            const required: (keyof AppFormData)[] = ['namaGuru', 'institusi', 'kurikulum', 'jenjang', 'fase', 'kelas', 'mapel'];
            required.forEach(field => {
                if (!formData[field]) {
                    newErrors[field] = true;
                    isValid = false;
                    if (!firstErrorId) firstErrorId = field;
                }
            });
        } else if (currentStep === 2) {
            const required: (keyof AppFormData)[] = ['materi', 'jumlahPertemuan', 'lamaWaktu', 'model'];
            required.forEach(field => {
                if (!formData[field]) {
                    newErrors[field] = true;
                    isValid = false;
                    if (!firstErrorId) firstErrorId = field;
                }
            });

            if (formData.kurikulum === 'kbc') {
                if (formData.topikPancaCinta.length === 0) {
                    newErrors.topikPancaCinta = true;
                    isValid = false;
                    if (!firstErrorId) firstErrorId = 'panca-cinta-wrapper';
                }
                if (formData.materiInsersi.length === 0) {
                    newErrors.materiInsersi = true;
                    isValid = false;
                    if (!firstErrorId) firstErrorId = 'materi-insersi-wrapper';
                }
            }

            if (formData.profilLulusan.length === 0) {
                newErrors.profilLulusan = true;
                isValid = false;
                if (!firstErrorId) firstErrorId = 'profil-lulusan-wrapper';
            }
        }

        setErrors(newErrors);
        
        if (!isValid && firstErrorId) {
            const element = document.getElementById(firstErrorId);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return isValid;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            if (step === 2) {
                // Calculate durations for meetings
                const menitPerPertemuan = parseInt(formData.lamaWaktu.replace(/\D/g,''), 10) || 0;
                const totalMenit = formData.jumlahPertemuan * menitPerPertemuan;
                const alokasi = `${formData.jumlahPertemuan} pertemuan (total ${totalMenit} menit)`;
                
                let pendahuluan = 0, penutup = 0, inti = 0;
                if (menitPerPertemuan > 0) {
                    if (menitPerPertemuan <= 25) {
                        pendahuluan = Math.floor(menitPerPertemuan * 0.2);
                        penutup = Math.floor(menitPerPertemuan * 0.2);
                    } else {
                        pendahuluan = Math.floor(menitPerPertemuan * 0.15);
                        penutup = Math.floor(menitPerPertemuan * 0.15);
                        if (menitPerPertemuan >= 40) {
                            pendahuluan = Math.max(5, pendahuluan);
                            penutup = Math.max(5, penutup);
                        }
                    }
                    inti = menitPerPertemuan - pendahuluan - penutup;
                }

                setFormData(prev => ({
                    ...prev,
                    alokasi,
                    durasiPendahuluanPerSesi: `${pendahuluan} menit`,
                    durasiIntiPerSesi: `${inti} menit`,
                    durasiPenutupPerSesi: `${penutup} menit`,
                    schoolProfile: schoolProfile,
                    documentDesign: documentDesign
                }));
                
                generate();
            } else {
                setStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 200 * 1024 * 1024) {
            alert("Ukuran file terlalu besar. Maksimal 200MB.");
            return;
        }

        setFileStatus('loading');
        try {
            const result = await handleFileUpload(file);
            setFormData(prev => ({
                ...prev,
                uploadedText: result.text,
                uploadedImage: result.image
            }));
            setFileName(file.name);
            setFileStatus('success');
        } catch (err) {
            console.error(err);
            setFileStatus('error');
            alert("Gagal membaca file.");
        }
    };

    // Full Module Generation
    const generate = async () => {
        setStep(3);
        setLoading(true);
        setError(null);
        setProgress(0);
        
        const interval = setInterval(() => {
            setProgress(prev => (prev < 99 ? prev + 1 : prev));
        }, 500);
        progressIntervalRef.current = interval;

        try {
            const prompt = assemblePrompt({
                ...formData,
                schoolProfile,
                documentDesign
            });
            const text = await generateModulAjar(prompt, formData.uploadedImage);
            
            clearInterval(interval);
            setProgress(100);

            // Parse response into structural blocks
            const parsedBlocks = parseGeneratedBlocks(text);
            setBlocks(parsedBlocks);
            if (parsedBlocks.length > 0) {
                setSelectedBlockId(parsedBlocks[0].id);
            }

            // Save version history entry
            const initVersion: VersionHistoryItem = {
                id: `v-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                label: 'Generasi Pertama AI',
                blocks: parsedBlocks,
                formData: formData,
                score: 85
            };
            setVersions([initVersion]);
            
            // Trigger automatic audit after generation
            runAudit(parsedBlocks);

        } catch (err) {
            clearInterval(interval);
            setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        } finally {
            setLoading(false);
        }
    };

    // AI Quality Audit Call
    const runAudit = async (currentBlocks: ModuleBlock[]) => {
        setIsAnalyzing(true);
        try {
            const resultJSON = await analyzeModulAjar(currentBlocks, formData.mapel);
            // Parse JSON block out of text response
            const match = resultJSON.match(/```json\s*([\s\S]*?)\s*```/) || [null, resultJSON];
            const jsonText = match[1] ? match[1].trim() : resultJSON.trim();
            const parsedAnalysis = JSON.parse(jsonText);
            setAnalysis(parsedAnalysis);
        } catch (e) {
            console.error("AI Audit failed: ", e);
            // Minimal Fallback Analysis
            setAnalysis({
                score: 80,
                checklist: {
                    cp: currentBlocks.some(b => b.title.toLowerCase().includes('cp') || b.content.toLowerCase().includes('capaian')),
                    tp: currentBlocks.some(b => b.title.toLowerCase().includes('tujuan') || b.content.toLowerCase().includes('tujuan pembelajaran')),
                    kktp: currentBlocks.some(b => b.title.toLowerCase().includes('kktp') || b.title.toLowerCase().includes('iktp') || b.content.toLowerCase().includes('kriteria')),
                    asesmenAwal: currentBlocks.some(b => b.content.toLowerCase().includes('asesmen awal') || b.content.toLowerCase().includes('diagnostik')),
                    formatif: currentBlocks.some(b => b.content.toLowerCase().includes('formatif')),
                    sumatif: currentBlocks.some(b => b.content.toLowerCase().includes('sumatif')),
                    lkpd: currentBlocks.some(b => b.title.toLowerCase().includes('lkpd') || b.content.toLowerCase().includes('lembar kerja')),
                    rubrik: currentBlocks.some(b => b.content.toLowerCase().includes('rubrik')),
                    daftarPustaka: currentBlocks.some(b => b.title.toLowerCase().includes('pustaka'))
                },
                scores: {
                    administrasi: 80,
                    regulasi: 85,
                    pembelajaran: 80,
                    asesmen: 75,
                    bahasa: 90,
                    desain: 90
                },
                warnings: [
                    { type: 'regulasi', message: 'Perlu verifikasi manual istilah regulasi Kemendikdasmen.' }
                ],
                recommendations: [
                    'Jalankan AI Audit ulang setelah melakukan penyuntingan manual.'
                ]
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Block Reordering & Editing
    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= blocks.length) return;
        
        saveStateForUndo();
        const updated = [...blocks];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        setBlocks(updated);
    };

    const deleteBlock = (id: string) => {
        if (confirm("Apakah Anda yakin ingin menghapus blok ini?")) {
            saveStateForUndo();
            const updated = blocks.filter(b => b.id !== id);
            setBlocks(updated);
            if (selectedBlockId === id) {
                setSelectedBlockId(updated[0]?.id || null);
            }
        }
    };

    const addCustomBlock = () => {
        saveStateForUndo();
        const newId = `block-custom-${Date.now()}`;
        const newBlock: ModuleBlock = {
            id: newId,
            title: 'Blok Tambahan Kustom',
            category: 'Komponen Inti',
            content: '# Judul Blok\nTulis konten kustom Anda di sini.'
        };
        setBlocks([...blocks, newBlock]);
        setSelectedBlockId(newId);
        setIsEditingBlock(true);
        setEditingContent(newBlock.content);
    };

    const startEditing = (block: ModuleBlock) => {
        setIsEditingBlock(true);
        setSelectedBlockId(block.id);
        setEditingContent(block.content);
    };

    const saveBlockEdit = () => {
        saveStateForUndo();
        setBlocks(prev => prev.map(b => b.id === selectedBlockId ? { ...b, content: editingContent } : b));
        setIsEditingBlock(false);
    };

    // Selective Generator Hub Call
    const callCopilotGenerate = async () => {
        setIsGeneratingPartial(true);
        try {
            const addInstructions = `Generator yang diminta: ${generatorType}. Detail instruksi: ${generatorInstructions}`;
            const generatedText = await generatePartialBlock(generatorType, 'Lampiran', formData, addInstructions);
            
            saveStateForUndo();
            const newId = `block-gen-${Date.now()}`;
            const newBlock: ModuleBlock = {
                id: newId,
                title: generatorType,
                category: 'Lampiran',
                content: generatedText
            };
            setBlocks([...blocks, newBlock]);
            setSelectedBlockId(newId);
            setIsEditingBlock(false);
            setGeneratorInstructions('');
            alert(`Berhasil membuat blok "${generatorType}" baru dan melampirkannya!`);
        } catch (e) {
            console.error(e);
            alert("Gagal me-generate konten parsial. Coba kurangi kompleksitas instruksi.");
        } finally {
            setIsGeneratingPartial(false);
        }
    };

    // Regulation Checker terms auto-replacement
    const runRegulatoryAutoFix = () => {
        saveStateForUndo();
        let replacedCount = 0;
        const updatedBlocks = blocks.map(b => {
            const before = b.content;
            const after = replaceRegulatoryTerms(before);
            if (before !== after) replacedCount++;
            return { ...b, content: after };
        });
        
        setBlocks(updatedBlocks);
        
        // Clean warnings list in analysis state
        if (analysis) {
            setAnalysis({
                ...analysis,
                warnings: analysis.warnings.filter((w: any) => w.type !== 'regulasi'),
                score: Math.min(100, analysis.score + 5)
            });
        }
        alert(`Berhasil memperbarui istilah regulasi di ${replacedCount} blok secara otomatis!`);
    };

    // Undo / Redo State managers
    const saveStateForUndo = () => {
        setUndoStack(prev => [...prev, blocks]);
        setRedoStack([]); // Clear redo
    };

    const triggerUndo = () => {
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        setRedoStack(r => [...r, blocks]);
        setBlocks(prev);
        setUndoStack(u => u.slice(0, u.length - 1));
    };

    const triggerRedo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(u => [...u, blocks]);
        setBlocks(next);
        setRedoStack(r => r.slice(0, r.length - 1));
    };

    const createManualVersion = (label: string = 'Revisi Manual') => {
        const newVersion: VersionHistoryItem = {
            id: `v-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            label: label,
            blocks: blocks,
            formData: formData,
            score: analysis?.score || 80
        };
        setVersions(prev => [...prev, newVersion]);
        alert(`Versi baru "${label}" berhasil disimpan!`);
    };

    const restoreVersion = (v: VersionHistoryItem) => {
        if (confirm(`Apakah Anda yakin ingin memulihkan dokumen ke versi "${v.label}"?`)) {
            saveStateForUndo();
            setBlocks(v.blocks);
            setFormData(v.formData);
            setAnalysis({ ...analysis, score: v.score });
        }
    };

    const reset = () => {
        setStep(1);
        setBlocks([]);
        setFormData({
            namaGuru: schoolProfile.namaGuru || '',
            institusi: schoolProfile.namaSekolah || '',
            tahun: '2025/2026',
            jenjang: '',
            kelas: '',
            fase: '',
            semester: 'Ganjil',
            mapel: '',
            elemen: '',
            cp: '',
            materi: '',
            jumlahPertemuan: 1,
            lamaWaktu: '2 x 40 menit',
            model: '',
            pendekatan: 'Deep Learning (Pembelajaran Mendalam)',
            metode: 'Diskusi, Tanya Jawab, Penugasan Mandiri',
            strategi: 'Pembelajaran Berdiferensiasi',
            media: 'Slide PPT, Gambar Konseptual, Quizizz',
            sumberBelajar: 'Buku Guru Kurikulum Merdeka Kemendikdasmen',
            karakteristikMurid: 'Siswa reguler dengan beragam gaya belajar',
            kesiapanBelajar: 'Siswa secara umum telah menguasai prasyarat dasar materi ini',
            saranaPrasarana: 'Proyektor, Laptop, Akses Internet, Papan Tulis',
            isDaring: false,
            topikPancaCinta: [],
            materiInsersi: [],
            profilLulusan: [],
            uploadedText: null,
            uploadedImage: null
        });
        setErrors({});
        setShowUpload(false);
        setFileStatus('idle');
        setFileName('');
        setAnalysis(null);
        setVersions([]);
    };

    // MathJax formatting hook
    useEffect(() => {
        if (blocks.length > 0 && (window as any).MathJax) {
            const container = document.getElementById('preview-content-box');
            if (container) {
                (window as any).MathJax.typesetPromise([container]);
            }
        }
    }, [blocks, selectedBlockId]);

    const activeBlock = blocks.find(b => b.id === selectedBlockId);

    // Document Print handler
    const handleDocumentPrint = () => {
        printDocument(blocks, documentDesign, schoolProfile, formData);
    };

    // DOCX Export handler
    const handleDOCXExport = () => {
        try {
            const marked = (window as any).marked;
            const htmlBody = blocks.map(b => `
                <h3>${b.title}</h3>
                <div>${marked ? marked.parse(b.content) : b.content}</div>
            `).join('<br><br>');
            exportToDOCX(htmlBody, formData.materi);
        } catch (err: any) {
            alert(`Gagal mengekspor ke Word: ${err.message || 'Terjadi kesalahan tak terduga.'}`);
        }
    };

    const renderStep1 = () => (
        <div className="form-container visible-form animate-fade-in-right">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-700 dark:text-emerald-400 mb-6">Langkah 1: Identitas & Informasi Dasar</h2>
            
            <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">A.</span>
                Informasi Pendidik & Institusi
            </h3>
            <div className="premium-card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <InputWrapper id="namaGuru" label="Nama Guru Penyusun" showError={errors.namaGuru}>
                        <input 
                            type="text" id="namaGuru" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.namaGuru ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-250 dark:border-slate-800'}`} 
                            placeholder="Contoh: Muhammad Irsyad Sirojul Khoeir, M.Sos."
                            value={formData.namaGuru}
                            onChange={e => updateForm('namaGuru', e.target.value)}
                        />
                    </InputWrapper>
                    <InputWrapper id="institusi" label="Nama Institusi/Sekolah" showError={errors.institusi}>
                        <input 
                            type="text" id="institusi" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.institusi ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-250 dark:border-slate-800'}`} 
                            placeholder="Contoh: MA Insan Cendekia Nusantara"
                            value={formData.institusi}
                            onChange={e => updateForm('institusi', e.target.value)}
                        />
                    </InputWrapper>
                    <div className="grid grid-cols-2 gap-3">
                        <InputWrapper id="tahun" label="Tahun Ajaran" showError={false}>
                            <input 
                                type="text" id="tahun" 
                                className="w-full p-3 rounded-xl border form-input-premium outline-none text-sm border-slate-250 dark:border-slate-800" 
                                value={formData.tahun}
                                onChange={e => updateForm('tahun', e.target.value)}
                            />
                        </InputWrapper>
                        <InputWrapper id="semester" label="Semester" showError={false}>
                            <select 
                                id="semester" 
                                className="w-full p-3 rounded-xl border form-input-premium outline-none text-sm border-slate-250 dark:border-slate-800"
                                value={formData.semester}
                                onChange={e => updateForm('semester', e.target.value)}
                            >
                                <option>Ganjil</option>
                                <option>Genap</option>
                            </select>
                        </InputWrapper>
                    </div>
                </div>
            </div>
            
            <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">B.</span>
                Landasan Kurikulum & Kelas
            </h3>
            <div className="premium-card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputWrapper id="kurikulum" label="Landasan Regulasi Kurikulum" showError={errors.kurikulum}>
                        <select 
                            id="kurikulum" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.kurikulum ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`}
                            value={formData.kurikulum}
                            onChange={e => {
                                updateForm('kurikulum', e.target.value);
                                updateForm('jenjang', '');
                                updateForm('fase', '');
                            }}
                        >
                            <option value="" disabled>Pilih Regulasi Kurikulum</option>
                            <option value="kumer">Kurikulum Merdeka (Nasional)</option>
                            <option value="kbc">Kurikulum Berbasis Cinta (Kemenag)</option>
                            <option value="khas">Kurikulum Khas Sekolah/Lokal</option>
                            <option value="yayasan">Kurikulum Standar Yayasan</option>
                        </select>
                    </InputWrapper>

                    {/* Custom curriculum title if khas/yayasan */}
                    {(formData.kurikulum === 'khas' || formData.kurikulum === 'yayasan') && (
                        <InputWrapper id="customKurikulumName" label="Nama Kurikulum Khusus" showError={false}>
                            <input 
                                type="text" id="customKurikulumName"
                                className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm"
                                placeholder="Contoh: Kurikulum Karakter Kepemimpinan Al-Fatih"
                                value={formData.customKurikulumName || ''}
                                onChange={e => updateForm('customKurikulumName', e.target.value)}
                            />
                        </InputWrapper>
                    )}

                    <InputWrapper id="jenjang" label="Jenjang Pendidikan" showError={errors.jenjang}>
                        <select 
                            id="jenjang" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed ${errors.jenjang ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`}
                            value={formData.jenjang}
                            onChange={e => {
                                updateForm('jenjang', e.target.value);
                                updateForm('fase', '');
                            }}
                            disabled={!formData.kurikulum}
                        >
                            <option value="" disabled>Pilih Jenjang</option>
                            {formData.kurikulum && (JENJANG_OPTIONS as any)[formData.kurikulum]?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </InputWrapper>

                    <div className="grid grid-cols-2 gap-4">
                        <InputWrapper id="fase" label="Fase" showError={errors.fase}>
                            <select 
                                id="fase" 
                                className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed ${errors.fase ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`}
                                value={formData.fase}
                                onChange={e => updateForm('fase', e.target.value)}
                                disabled={!formData.jenjang}
                            >
                                <option value="" disabled>Pilih Fase</option>
                                {formData.jenjang && (FASE_MAPPING[formData.jenjang] || FASE_MAPPING[formData.jenjang.replace(/-/g,'')])?.map((f: string) => (
                                    <option key={f} value={f}>{FASE_DESCRIPTIONS[f] || f}</option>
                                ))}
                            </select>
                        </InputWrapper>

                        <InputWrapper id="kelas" label="Kelas" showError={errors.kelas}>
                            <input 
                                type="text" id="kelas" 
                                className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.kelas ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`} 
                                placeholder="Contoh: VII atau 10"
                                value={formData.kelas}
                                onChange={e => updateForm('kelas', e.target.value)}
                            />
                        </InputWrapper>
                    </div>

                    <InputWrapper id="mapel" label="Mata Pelajaran" showError={errors.mapel}>
                        <input 
                            type="text" id="mapel" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.mapel ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`} 
                            placeholder="Contoh: PAI / Bahasa Arab / IPA"
                            value={formData.mapel}
                            onChange={e => updateForm('mapel', e.target.value)}
                        />
                    </InputWrapper>
                </div>
            </div>

            <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">C.</span>
                Capaian & Elemen Kurikulum
            </h3>
            <div className="premium-card">
                <div className="grid grid-cols-1 gap-5">
                    <InputWrapper id="elemen" label="Elemen Mapel (Opsional)" showError={false}>
                        <input 
                            type="text" id="elemen" 
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm" 
                            placeholder="Contoh: Al-Qur'an dan Hadis / Pengukuran Aljabar"
                            value={formData.elemen}
                            onChange={e => updateForm('elemen', e.target.value)}
                        />
                    </InputWrapper>
                    <InputWrapper id="cp" label="Deskripsi Capaian Pembelajaran (CP) Resmi" showError={false}>
                        <textarea 
                            id="cp" 
                            rows={3}
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm resize-y" 
                            placeholder="Tempel deskripsi Capaian Pembelajaran (CP) dari regulasi BSKAP terbaru di sini untuk keselarasan modul yang tinggi."
                            value={formData.cp}
                            onChange={e => updateForm('cp', e.target.value)}
                        />
                    </InputWrapper>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="form-container visible-form animate-fade-in-right">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-700 dark:text-emerald-400 mb-6">Langkah 2: Detail Pembelajaran & Aspek Diferensiasi</h2>
            
            <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">A.</span>
                Alokasi & Model
            </h3>
            <div className="premium-card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <InputWrapper id="materi" label="Materi Pokok / Judul Pembelajaran" showError={errors.materi}>
                            <input 
                                type="text" id="materi" 
                                className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.materi ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`} 
                                placeholder="Contoh: Struktur Sel Hewan dan Tumbuhan"
                                value={formData.materi}
                                onChange={e => updateForm('materi', e.target.value)}
                            />
                        </InputWrapper>
                    </div>
                    
                    <InputWrapper id="jumlahPertemuan" label="Jumlah Sesi Pertemuan" showError={errors.jumlahPertemuan}>
                        <select 
                            id="jumlahPertemuan" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.jumlahPertemuan ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`}
                            value={formData.jumlahPertemuan}
                            onChange={e => updateForm('jumlahPertemuan', parseInt(e.target.value))}
                        >
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n} Sesi Pertemuan</option>
                            ))}
                        </select>
                    </InputWrapper>

                    <InputWrapper id="lamaWaktu" label="Durasi per Pertemuan" showError={errors.lamaWaktu}>
                        <input 
                            type="text" id="lamaWaktu" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.lamaWaktu ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`} 
                            placeholder="Contoh: 2 x 40 menit"
                            value={formData.lamaWaktu}
                            onChange={e => updateForm('lamaWaktu', e.target.value)}
                        />
                    </InputWrapper>

                    <InputWrapper id="model" label="Model Pembelajaran" showError={errors.model}>
                        <select 
                            id="model" 
                            className={`w-full p-3 rounded-xl border form-input-premium outline-none text-sm ${errors.model ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'}`}
                            value={formData.model}
                            onChange={e => updateForm('model', e.target.value)}
                        >
                            <option value="" disabled>Pilih Model</option>
                            <option>Deep Learning (Pembelajaran Mendalam)</option>
                            <option>Project Based Learning (PjBL)</option>
                            <option>Problem Based Learning (PBL)</option>
                            <option>Case Based Learning (CBL)</option>
                            <option>Discovery Learning</option>
                            <option>Inquiry Learning</option>
                            <option>Contextual Teaching and Learning (CTL)</option>
                            <option>Cooperative Learning</option>
                            <option>Pembelajaran Berdiferensiasi</option>
                        </select>
                    </InputWrapper>

                    <InputWrapper id="pendekatan" label="Pendekatan Pembelajaran" showError={false}>
                        <input 
                            type="text" id="pendekatan"
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm"
                            value={formData.pendekatan}
                            onChange={e => updateForm('pendekatan', e.target.value)}
                        />
                    </InputWrapper>
                </div>
            </div>

            <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">B.</span>
                Karakteristik & Kesiapan Belajar Murid
            </h3>
            <div className="premium-card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputWrapper id="karakteristikMurid" label="Karakteristik Murid (Gaya Belajar/Jumlah)" showError={false}>
                        <input 
                            type="text" id="karakteristikMurid"
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm"
                            value={formData.karakteristikMurid}
                            onChange={e => updateForm('karakteristikMurid', e.target.value)}
                        />
                    </InputWrapper>
                    <InputWrapper id="kesiapanBelajar" label="Kesiapan Belajar Murid (Prasyarat)" showError={false}>
                        <input 
                            type="text" id="kesiapanBelajar"
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm"
                            value={formData.kesiapanBelajar}
                            onChange={e => updateForm('kesiapanBelajar', e.target.value)}
                        />
                    </InputWrapper>
                    <div className="md:col-span-2">
                        <InputWrapper id="saranaPrasarana" label="Sarana & Prasarana" showError={false}>
                            <textarea 
                                id="saranaPrasarana"
                                rows={2}
                                className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm resize-y"
                                value={formData.saranaPrasarana}
                                onChange={e => updateForm('saranaPrasarana', e.target.value)}
                            />
                        </InputWrapper>
                    </div>
                </div>
            </div>

            <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">C.</span>
                Metode, Media & Sumber Belajar
            </h3>
            <div className="premium-card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                    <InputWrapper id="metode" label="Metode Pembelajaran" showError={false}>
                        <input 
                            type="text" id="metode"
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm"
                            value={formData.metode}
                            onChange={e => updateForm('metode', e.target.value)}
                        />
                    </InputWrapper>
                    <InputWrapper id="media" label="Media Pembelajaran" showError={false}>
                        <input 
                            type="text" id="media"
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm"
                            value={formData.media}
                            onChange={e => updateForm('media', e.target.value)}
                        />
                    </InputWrapper>
                    <InputWrapper id="sumberBelajar" label="Sumber Belajar" showError={false}>
                        <input 
                            type="text" id="sumberBelajar"
                            className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-800 form-input-premium outline-none text-sm"
                            value={formData.sumberBelajar}
                            onChange={e => updateForm('sumberBelajar', e.target.value)}
                        />
                    </InputWrapper>
                </div>

                {/* School Textbook File Upload */}
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-800/80 mb-5 transition-all-300">
                    <label className="flex items-center space-x-3 cursor-pointer mb-2">
                        <input 
                            type="checkbox" 
                            checked={showUpload} 
                            onChange={e => setShowUpload(e.target.checked)}
                            className="form-checkbox h-5 w-5 text-emerald-650 rounded focus:ring-emerald-500/20 border-slate-300 dark:border-slate-800 dark:bg-slate-900" 
                        />
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">Punya materi buku paket sendiri? Upload dokumen rujukan di sini</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Centang jika Anda ingin melampirkan teks buku rujukan agar materi AI sejalan dengan buku Anda.</p>
                        </div>
                    </label>

                    {showUpload && (
                        <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4 animate-fade-in-up">
                            <div className="file-upload-zone rounded-xl p-5 text-center cursor-pointer relative bg-white dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800" onClick={() => document.getElementById('fileUploadInput')?.click()}>
                                <input 
                                    type="file" 
                                    id="fileUploadInput" 
                                    className="hidden" 
                                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                                    onChange={onFileChange}
                                />
                                {fileStatus === 'idle' && (
                                    <>
                                        <svg className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400"><span className="font-semibold text-emerald-600 hover:text-emerald-500">Klik untuk upload rujukan</span> atau seret dokumen ke sini</p>
                                        <p className="mt-1 text-[9px] text-slate-400 dark:text-slate-500">PDF, DOCX, JPG, PNG (Maks 200MB)</p>
                                    </>
                                )}
                                {fileStatus === 'loading' && (
                                    <div>
                                        <div className="loader mx-auto h-5 w-5 border-2 border-emerald-500/20 border-t-emerald-600"></div>
                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Sedang mengekstrak teks materi...</p>
                                    </div>
                                )}
                                {fileStatus === 'success' && (
                                    <div>
                                        <svg className="mx-auto h-8 w-8 text-emerald-500 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">{fileName}</p>
                                        <p className="mt-1 text-[10px] text-emerald-650 dark:text-emerald-450">Materi rujukan berhasil disinkronkan.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Daring Option */}
                <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 p-4 rounded-xl transition-all-300">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={formData.isDaring}
                            onChange={e => updateForm('isDaring', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-emerald-600 rounded focus:ring-emerald-500/20 border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                        />
                        <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">Mode Mengajar Daring (Online/PJJ)</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Centang jika modul ini dirancang khusus untuk pembelajaran jarak jauh via video conference.</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* KBC Fields */}
            {formData.kurikulum === 'kbc' && (
                <div id="kbc-fields-wrapper" className="bg-emerald-55/40 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/35 p-5 rounded-2xl mb-6 animate-fade-in-up">
                    <h3 className="text-xs font-heading font-bold text-emerald-850 dark:text-emerald-400 uppercase tracking-wider mb-3">Integrasi Khusus Kurikulum Berbasis Cinta</h3>
                    
                    <InputWrapper id="panca-cinta-wrapper" label="Topik Panca Cinta (Pilih minimal 1)" showError={errors.topikPancaCinta}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                            {Object.keys(KBC_DATA).map(key => (
                                <label key={key} className="flex items-center space-x-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-950 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 hover:border-emerald-200 transition-colors shadow-sm cursor-pointer hover-item-animate">
                                    <input 
                                        type="checkbox" 
                                        className="form-checkbox h-4.5 w-4.5 text-emerald-600 rounded focus:ring-emerald-500/20 border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                                        checked={formData.topikPancaCinta.includes(key)}
                                        onChange={() => toggleCheckbox('topikPancaCinta', key)}
                                    />
                                    <span className="text-slate-800 dark:text-slate-200 text-xs font-semibold">{key}</span>
                                </label>
                            ))}
                        </div>
                    </InputWrapper>

                    <div className="mt-4">
                        <InputWrapper id="materi-insersi-wrapper" label="Materi Insersi Ajaran Cinta (Pilih minimal 1)" showError={errors.materiInsersi}>
                            <div className="space-y-3 p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850 max-h-56 overflow-y-auto custom-scrollbar mt-2">
                                {formData.topikPancaCinta.length === 0 ? (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">Centang Topik Panca Cinta di atas terlebih dahulu.</p>
                                ) : (
                                    formData.topikPancaCinta.map(topic => (
                                        <div key={topic} className="mb-4 last:mb-0">
                                            <h4 className="text-[10px] font-bold text-emerald-700 dark:text-emerald-450 tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded inline-block mb-1.5">{topic}</h4>
                                            <div className="space-y-1.5 ml-1">
                                                {KBC_DATA[topic].map(item => (
                                                    <label key={item} className="flex items-start space-x-2.5 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer text-xs">
                                                        <input 
                                                            type="checkbox" 
                                                            className="form-checkbox h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500/20 border-slate-300 dark:border-slate-850 mt-0.5 dark:bg-slate-900"
                                                            checked={formData.materiInsersi.includes(item)}
                                                            onChange={() => toggleCheckbox('materiInsersi', item)}
                                                        />
                                                        <span className="text-slate-700 dark:text-slate-300 leading-tight">{item}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </InputWrapper>
                    </div>
                </div>
            )}

            {/* Profil Lulusan */}
            <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">D.</span>
                Profil Pelajar/Lulusan
            </h3>
            <div className="premium-card">
                <InputWrapper label="Dimensi Profil Lulusan (Sesuai SKL Standar Terbaru)" showError={errors.profilLulusan} errorMsg="Harap pilih minimal 1 Dimensi">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Dimensi karakter lulusan yang ingin diasah dalam modul ajar ini (pilih minimal 1):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            "Keimanan dan Ketakwaan kepada Tuhan Yang Maha Esa dan akhlak mulia",
                            "Kewargaan",
                            "Penalaran Kritis",
                            "Kreativitas",
                            "Kolaborasi",
                            "Kemandirian",
                            "Kesehatan",
                            "Komunikasi"
                        ].map(dim => (
                            <label key={dim} className="flex items-center space-x-3 text-slate-800 dark:text-slate-200 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm cursor-pointer hover:border-slate-250 dark:hover:border-slate-700 bg-white dark:bg-slate-950">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox h-4.5 w-4.5 text-emerald-600 rounded focus:ring-emerald-500/20 border-slate-350 dark:border-slate-800 dark:bg-slate-900"
                                    checked={formData.profilLulusan.includes(dim)}
                                    onChange={() => toggleCheckbox('profilLulusan', dim)}
                                />
                                <span className="text-xs font-semibold">{dim.includes("Keimanan") ? "Keimanan, Ketakwaan & Akhlak Mulia" : dim}</span>
                            </label>
                        ))}
                    </div>
                </InputWrapper>
            </div>
        </div>
    );

    // Sidebar rendering logic
    const renderSidebarContent = () => {
        switch (activeTab) {
            case 'outline':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-800">Daftar Blok Modul</h3>
                            <button 
                                onClick={addCustomBlock} 
                                className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors"
                            >
                                + Tambah Blok
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
                            {blocks.map((block, idx) => (
                                <div 
                                    key={block.id} 
                                    onClick={() => { setSelectedBlockId(block.id); setIsEditingBlock(false); }}
                                    className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                        selectedBlockId === block.id 
                                            ? 'bg-emerald-50 border-emerald-400 shadow-sm' 
                                            : 'bg-white border-slate-150 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-800 truncate max-w-[160px]">{block.title}</span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                            block.category === 'Informasi Umum' ? 'bg-blue-100 text-blue-800' :
                                            block.category === 'Komponen Inti' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {block.category.replace('A. ', '').replace('B. ', '').replace('C. ', '')}
                                        </span>
                                    </div>
                                    <div className="flex justify-end space-x-1.5 mt-2.5 pt-2 border-t border-slate-100/50">
                                        <button 
                                            disabled={idx === 0} 
                                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }}
                                            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 p-0.5 hover:bg-slate-100 rounded"
                                            title="Pindahkan Ke Atas"
                                        >
                                            ▲
                                        </button>
                                        <button 
                                            disabled={idx === blocks.length - 1} 
                                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }}
                                            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 p-0.5 hover:bg-slate-100 rounded"
                                            title="Pindahkan Ke Bawah"
                                        >
                                            ▼
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                            className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded"
                                            title="Hapus Blok"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Undo & Redo buttons */}
                        <div className="flex justify-between border-t border-slate-150 pt-3">
                            <button 
                                disabled={undoStack.length === 0} 
                                onClick={triggerUndo} 
                                className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40"
                            >
                                ↶ Undo
                            </button>
                            <button 
                                disabled={redoStack.length === 0} 
                                onClick={triggerRedo} 
                                className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40"
                            >
                                Redo ↷
                            </button>
                        </div>
                    </div>
                );
            case 'copilot':
                return (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-800">AI Copilot & Generator Parsial</h3>
                        <p className="text-[11px] text-slate-500">Buat atau regenerasi komponen tertentu dengan parameter kustom secara cepat.</p>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Generator</label>
                                <select 
                                    value={generatorType}
                                    onChange={e => setGeneratorType(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                                >
                                    <option>Materi Ajar Lengkap</option>
                                    <option>Lembar Kerja Murid (LKPD) Discovery</option>
                                    <option>Lembar Kerja Murid (LKPD) Inquiry</option>
                                    <option>Lembar Kerja Murid (LKPD) PBL/PjBL</option>
                                    <option>Lembar Kerja Murid (LKPD) HOTS</option>
                                    <option>Asesmen Pilihan Ganda & Uraian HOTS</option>
                                    <option>Asesmen AKM & Studi Kasus</option>
                                    <option>Rubrik Penilaian Proyek & Sikap</option>
                                    <option>Kegiatan Pengayaan & Remedial</option>
                                    <option>Model Refleksi Murid & Guru</option>
                                    <option>Saran Media Pembelajaran & Link</option>
                                    <option>Ice Breaking Menarik</option>
                                    <option>Pertanyaan Pemantik LOTS/MOTS/HOTS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Instruksi Tambahan (Opsional)</label>
                                <textarea 
                                    value={generatorInstructions}
                                    onChange={e => setGeneratorInstructions(e.target.value)}
                                    rows={4}
                                    placeholder="Contoh: Buat LKPD Diferensiasi dengan 3 level kesulitan atau Buat soal Asesmen materi sel hewan sebanyak 5 nomor PG dan 2 Uraian..."
                                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 resize-none focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <button 
                                disabled={isGeneratingPartial}
                                onClick={callCopilotGenerate}
                                className="w-full bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-500 flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
                            >
                                {isGeneratingPartial ? (
                                    <>
                                        <div className="loader h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                                        <span>Sedang Menyusun...</span>
                                    </>
                                ) : (
                                    <span>Generate & Tambahkan ke Lampiran</span>
                                )}
                            </button>
                        </div>
                    </div>
                );
            case 'checker':
                return (
                    <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-800">Evaluasi & AI Audit</h3>
                            <button 
                                disabled={isAnalyzing}
                                onClick={() => runAudit(blocks)}
                                className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
                            >
                                {isAnalyzing ? 'Mengaudit...' : 'Audit Ulang'}
                            </button>
                        </div>

                        {analysis ? (
                            <div className="space-y-4">
                                {/* Score Indicator */}
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Skor Kualitas Dokumen</span>
                                    <div className="text-4xl font-extrabold text-emerald-700 mt-1">{analysis.score || 85}/100</div>
                                    
                                    {/* Breakdown */}
                                    <div className="grid grid-cols-3 gap-x-2 gap-y-3 mt-4 text-[10px] text-slate-650 border-t border-emerald-100/50 pt-3">
                                        <div>
                                            <strong>Administrasi:</strong><br/>
                                            <span className="font-semibold text-emerald-800">{analysis.scores?.administrasi || 85}</span>
                                        </div>
                                        <div>
                                            <strong>Regulasi:</strong><br/>
                                            <span className="font-semibold text-emerald-800">{analysis.scores?.regulasi || 80}</span>
                                        </div>
                                        <div>
                                            <strong>Pembelajaran:</strong><br/>
                                            <span className="font-semibold text-emerald-800">{analysis.scores?.pembelajaran || 85}</span>
                                        </div>
                                        <div>
                                            <strong>Asesmen:</strong><br/>
                                            <span className="font-semibold text-emerald-800">{analysis.scores?.asesmen || 80}</span>
                                        </div>
                                        <div>
                                            <strong>Bahasa:</strong><br/>
                                            <span className="font-semibold text-emerald-800">{analysis.scores?.bahasa || 90}</span>
                                        </div>
                                        <div>
                                            <strong>Desain:</strong><br/>
                                            <span className="font-semibold text-emerald-800">{analysis.scores?.desain || 85}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Checklist kelengkapan */}
                                <div className="p-4 bg-white rounded-2xl border border-slate-150">
                                    <h4 className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Checklist Kelengkapan Modul</h4>
                                    <div className="space-y-1.5">
                                        {[
                                            { key: 'cp', label: 'Capaian Pembelajaran (CP)' },
                                            { key: 'tp', label: 'Tujuan Pembelajaran (TP)' },
                                            { key: 'kktp', label: 'Kriteria Ketercapaian (KKTP)' },
                                            { key: 'asesmenAwal', label: 'Asesmen Diagnostik Awal' },
                                            { key: 'formatif', label: 'Asesmen Formatif (Proses)' },
                                            { key: 'sumatif', label: 'Asesmen Sumatif (Akhir)' },
                                            { key: 'lkpd', label: 'Lembar Kerja Murid (LKPD)' },
                                            { key: 'rubrik', label: 'Rubrik Penilaian Lengkap' },
                                            { key: 'daftarPustaka', label: 'Glosarium & Daftar Pustaka' }
                                        ].map(item => (
                                            <div key={item.key} className="flex items-center space-x-2 text-xs">
                                                <span>{analysis.checklist?.[item.key] ? '✅' : '❌'}</span>
                                                <span className={analysis.checklist?.[item.key] ? 'text-slate-800' : 'text-slate-400 line-through'}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Warnings & Nomenklatur Checker */}
                                <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-red-800">Temuan & Nomenklatur</h4>
                                        {analysis.warnings?.some((w: any) => w.type === 'regulasi') && (
                                            <button 
                                                onClick={runRegulatoryAutoFix}
                                                className="text-[10px] bg-red-650 text-white font-bold px-2 py-0.5 rounded hover:bg-red-500"
                                            >
                                                Perbaiki Istilah
                                            </button>
                                        )}
                                    </div>
                                    {analysis.warnings && analysis.warnings.length > 0 ? (
                                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                                            {analysis.warnings.map((warn: any, wIdx: number) => (
                                                <li key={wIdx}>
                                                    <strong className="capitalize text-red-600 font-bold">[{warn.type}]: </strong>
                                                    {warn.message}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-emerald-700 font-semibold">Semua istilah, konsistensi, dan bahasa dalam modul telah sesuai standar!</p>
                                    )}
                                </div>

                                {/* Recommendations */}
                                {analysis.recommendations && (
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <h4 className="text-xs font-bold text-blue-800 mb-2">Rekomendasi Perbaikan</h4>
                                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-755">
                                            {analysis.recommendations.map((rec: string, rIdx: number) => (
                                                <li key={rIdx}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">Jalankan AI Audit untuk mendeteksi skor kelayakan modul Anda.</p>
                        )}
                    </div>
                );
            case 'design':
                return (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-800">Desain & Kustomisasi</h3>
                        <p className="text-[11px] text-slate-500">Sesuaikan tipografi, tata letak, dan visual dokumen Anda.</p>
                        
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-750 mb-1">Tema Desain</label>
                                <select 
                                    value={documentDesign.theme}
                                    onChange={e => setDocumentDesign({ ...documentDesign, theme: e.target.value as any })}
                                    className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                                >
                                    <option value="formal">Formal Kemendikdasmen</option>
                                    <option value="minimalis">Minimalis Bersih</option>
                                    <option value="modern">Modern Emerald (Default)</option>
                                    <option value="islami">Islami Hijau & Emas</option>
                                    <option value="colorful">Colorful Kreatif</option>
                                    <option value="mono">Hitam Putih (Hemat Tinta)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Warna Utama</label>
                                    <input 
                                        type="color" 
                                        value={documentDesign.primaryColor}
                                        onChange={e => setDocumentDesign({ ...documentDesign, primaryColor: e.target.value })}
                                        className="w-full h-8 rounded cursor-pointer border border-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Warna Kedua</label>
                                    <input 
                                        type="color" 
                                        value={documentDesign.secondaryColor}
                                        onChange={e => setDocumentDesign({ ...documentDesign, secondaryColor: e.target.value })}
                                        className="w-full h-8 rounded cursor-pointer border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Gaya Font</label>
                                <select 
                                    value={documentDesign.fontFamily}
                                    onChange={e => setDocumentDesign({ ...documentDesign, fontFamily: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                                >
                                    <option value="sans-serif">Inter (Sans-Serif Modern)</option>
                                    <option value="serif">Lora / Times New Roman (Serif Formal)</option>
                                    <option value="mono">Courier New (Monospace)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Ukuran Margin</label>
                                <select 
                                    value={documentDesign.marginSize}
                                    onChange={e => setDocumentDesign({ ...documentDesign, marginSize: e.target.value as any })}
                                    className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                                >
                                    <option value="normal">Normal (2.5 cm)</option>
                                    <option value="narrow">Sempit (1.2 cm)</option>
                                    <option value="wide">Lebar (3.8 cm)</option>
                                </select>
                            </div>

                            <div className="space-y-2 border-t border-slate-100 pt-3">
                                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={documentDesign.showCover}
                                        onChange={e => setDocumentDesign({ ...documentDesign, showCover: e.target.checked })}
                                        className="form-checkbox text-emerald-600 rounded"
                                    />
                                    <span>Tampilkan Halaman Sampul (Cover)</span>
                                </label>
                                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={documentDesign.useIcons}
                                        onChange={e => setDocumentDesign({ ...documentDesign, useIcons: e.target.checked })}
                                        className="form-checkbox text-emerald-600 rounded"
                                    />
                                    <span>Gunakan Ikon dalam Modul</span>
                                </label>
                                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={documentDesign.showPageNumbers}
                                        onChange={e => setDocumentDesign({ ...documentDesign, showPageNumbers: e.target.checked })}
                                        className="form-checkbox text-emerald-600 rounded"
                                    />
                                    <span>Tampilkan Nomor Halaman</span>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'school':
                return (
                    <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
                        <h3 className="text-sm font-bold text-slate-800">Profil Sekolah & Riwayat Versi</h3>
                        
                        {/* School identity form */}
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 space-y-2.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kop Identitas Sekolah</span>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Sekolah</label>
                                <input 
                                    type="text" 
                                    value={schoolProfile.namaSekolah}
                                    onChange={e => saveSchoolProfile({ ...schoolProfile, namaSekolah: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded text-xs bg-white text-slate-800"
                                    placeholder="Nama Sekolah"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Alamat Sekolah</label>
                                <input 
                                    type="text" 
                                    value={schoolProfile.alamat}
                                    onChange={e => saveSchoolProfile({ ...schoolProfile, alamat: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded text-xs bg-white text-slate-800"
                                    placeholder="Alamat Lengkap"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">NPSN</label>
                                    <input 
                                        type="text" 
                                        value={schoolProfile.npsn}
                                        onChange={e => saveSchoolProfile({ ...schoolProfile, npsn: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white text-slate-800"
                                        placeholder="NPSN"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">NSS</label>
                                    <input 
                                        type="text" 
                                        value={schoolProfile.nss}
                                        onChange={e => saveSchoolProfile({ ...schoolProfile, nss: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white text-slate-800"
                                        placeholder="NSS"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kepala Sekolah</label>
                                <input 
                                    type="text" 
                                    value={schoolProfile.kepalaSekolah}
                                    onChange={e => saveSchoolProfile({ ...schoolProfile, kepalaSekolah: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded text-xs bg-white text-slate-800"
                                    placeholder="Nama Kepala Sekolah"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Upload Logo Sekolah (Image)</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const r = new FileReader();
                                            r.onload = () => {
                                                saveSchoolProfile({ ...schoolProfile, logoUrl: r.result as string });
                                            };
                                            r.readAsDataURL(file);
                                        }
                                    }}
                                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                />
                                {schoolProfile.logoUrl && (
                                    <div className="mt-2 flex items-center space-x-2">
                                        <img src={schoolProfile.logoUrl} className="h-8 w-8 object-contain rounded border" />
                                        <button 
                                            onClick={() => saveSchoolProfile({ ...schoolProfile, logoUrl: undefined })}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Hapus Logo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Version History */}
                        <div className="border-t border-slate-150 pt-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Riwayat Versi Dokumen</span>
                                <button 
                                    onClick={() => {
                                        const lbl = prompt("Beri nama versi revisi ini:", "Revisi Manual");
                                        if (lbl) createManualVersion(lbl);
                                    }}
                                    className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 font-bold hover:bg-slate-200"
                                >
                                    + Simpan Versi
                                </button>
                            </div>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                {versions.map((ver, vIdx) => (
                                    <div key={ver.id} className="p-2 rounded-lg border border-slate-150 bg-white text-xs flex justify-between items-center">
                                        <div className="truncate max-w-[130px]">
                                            <div className="font-bold text-slate-800 truncate">{ver.label}</div>
                                            <div className="text-[9px] text-slate-400">{ver.timestamp} (Skor: {ver.score})</div>
                                        </div>
                                        <div className="flex space-x-1">
                                            <button 
                                                onClick={() => restoreVersion(ver)}
                                                className="text-[9px] text-emerald-600 font-bold hover:underline"
                                            >
                                                Pulihkan
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setCompareVersion(ver);
                                                    setShowCompareModal(true);
                                                }}
                                                className="text-[9px] text-blue-600 font-bold hover:underline"
                                            >
                                                Banding
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    const renderStep3 = () => (
        <div className="visible-form animate-fade-in-right">
            {loading ? (
                <div className="text-center py-16">
                    <div className="loader mx-auto border-4 border-slate-100 border-t-emerald-600"></div>
                    <p className="mt-5 text-slate-750 font-bold text-lg">Kecerdasan AI sedang merangkai Modul Ajar lengkap...</p>
                    <p className="text-emerald-650 font-extrabold text-4xl mt-2">{progress}%</p>
                    <p className="text-slate-400 text-xs mt-1">Langkah ini mem-parsing CP dan mematangkan langkah Deep Learning.</p>
                    <div className="mt-5 inline-block bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">
                        <p className="text-red-600 text-xs font-bold animate-pulse">
                            Mohon tidak memuat ulang halaman saat AI merakit Lampiran dan LKPD lengkap.
                        </p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 animate-bounce"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <h3 className="text-xl font-bold text-red-600">Gagal Menghubungkan ke Gemini</h3>
                    <p className="text-slate-500 mt-2 mb-6 max-w-lg mx-auto text-sm">{error}</p>
                    <div className="flex justify-center space-x-3">
                        <button onClick={handleBack} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200">Kembali</button>
                        <button onClick={generate} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-500">Coba Lagi</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* LEFT PANEL: Workspace Control Panel */}
                    <div className="w-full lg:w-[350px] bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
                        <div>
                            {/* Segmented iOS Capsule Tabs */}
                            <div className="grid grid-cols-5 bg-slate-100/80 dark:bg-slate-950/80 p-1 rounded-xl mb-4 text-[10px] font-extrabold relative z-0">
                                <button 
                                    onClick={() => setActiveTab('outline')}
                                    className={`py-1.5 rounded-lg text-center transition-all duration-250 ${
                                        activeTab === 'outline' 
                                            ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Struktur
                                </button>
                                <button 
                                    onClick={() => setActiveTab('copilot')}
                                    className={`py-1.5 rounded-lg text-center transition-all duration-250 ${
                                        activeTab === 'copilot' 
                                            ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Copilot
                                </button>
                                <button 
                                    onClick={() => setActiveTab('checker')}
                                    className={`py-1.5 rounded-lg text-center transition-all duration-250 ${
                                        activeTab === 'checker' 
                                            ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Audit
                                </button>
                                <button 
                                    onClick={() => setActiveTab('design')}
                                    className={`py-1.5 rounded-lg text-center transition-all duration-250 ${
                                        activeTab === 'design' 
                                            ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Desain
                                </button>
                                <button 
                                    onClick={() => setActiveTab('school')}
                                    className={`py-1.5 rounded-lg text-center transition-all duration-250 ${
                                        activeTab === 'school' 
                                            ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Profil
                                </button>
                            </div>

                            {/* Render Tab Contents */}
                            {renderSidebarContent()}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Live Preview & Document Editor */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 min-h-[60vh] flex flex-col justify-between shadow-sm">
                        {/* Editor Mode Header */}
                        {isEditingBlock && activeBlock ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">Mode Penyuntingan Langsung</span>
                                    <h4 className="text-xs font-bold text-slate-800">{activeBlock.title}</h4>
                                </div>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={() => setIsEditingBlock(false)} 
                                        className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-slate-200"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={saveBlockEdit} 
                                        className="text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-500"
                                    >
                                        Simpan Perubahan
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {/* Top Preview Bar */}
                        <div className="flex flex-wrap gap-3 justify-between items-center border-b border-slate-100 pb-3 mb-5">
                            <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-slate-600">Pratinjau Modul Aktif</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={handleDocumentPrint}
                                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-slate-200 flex items-center space-x-1"
                                >
                                    <span>🖨️ Cetak / PDF</span>
                                </button>
                                <button 
                                    onClick={handleDOCXExport}
                                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-emerald-500 flex items-center space-x-1 shadow-sm"
                                >
                                    <span>💾 Word (.docx)</span>
                                </button>
                                <button
                                    onClick={() => {
                                        try {
                                            const marked = (window as any).marked;
                                            const htmlBody = blocks.map(b => `<h3>${b.title}</h3><div>${marked ? marked.parse(b.content) : b.content}</div>`).join('<br><br>');
                                            exportToHTML(htmlBody, formData.materi);
                                        } catch (err: any) {
                                            alert(`Gagal mengekspor ke HTML: ${err.message || 'Terjadi kesalahan tak terduga.'}`);
                                        }
                                    }}
                                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-slate-200"
                                >
                                    HTML
                                </button>
                                <button
                                    onClick={() => {
                                        try {
                                            const mdBody = blocks.map(b => `### ${b.title}\n\n${b.content}`).join('\n\n');
                                            exportToMarkdown(mdBody, formData.materi);
                                        } catch (err: any) {
                                            alert(`Gagal mengekspor ke Markdown: ${err.message || 'Terjadi kesalahan tak terduga.'}`);
                                        }
                                    }}
                                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-slate-200"
                                >
                                    MD
                                </button>
                                <button
                                    onClick={() => {
                                        try {
                                            const marked = (window as any).marked;
                                            const htmlBody = blocks.map(b => `<h3>${b.title}</h3><div>${marked ? marked.parse(b.content) : b.content}</div>`).join('<br><br>');
                                            exportToODT(htmlBody, formData.materi);
                                        } catch (err: any) {
                                            alert(`Gagal mengekspor ke ODT: ${err.message || 'Terjadi kesalahan tak terduga.'}`);
                                        }
                                    }}
                                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-slate-200"
                                >
                                    ODT
                                </button>
                            </div>
                        </div>

                        {/* Middle Content Preview/Editor Box */}
                        <div id="preview-content-box" className="flex-1 min-h-[450px]">
                            {isEditingBlock && activeBlock ? (
                                <div className="h-full flex flex-col">
                                    <textarea 
                                        value={editingContent}
                                        onChange={e => setEditingContent(e.target.value)}
                                        className="w-full flex-1 p-4 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs sm:text-sm bg-slate-50/50 text-slate-900 resize-none min-h-[400px]"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1">Mendukung format Markdown standar (seperti # untuk judul, - untuk poin).</span>
                                </div>
                            ) : activeBlock ? (
                                <div 
                                    onClick={() => startEditing(activeBlock)}
                                    className="prose-custom bg-white border border-slate-100 rounded-xl p-5 hover:border-emerald-300 hover:bg-slate-50/20 cursor-pointer transition-all duration-200 min-h-[400px]"
                                    style={{
                                        fontFamily: documentDesign.fontFamily === 'serif' ? 'Lora, serif' : (documentDesign.fontFamily === 'mono' ? 'Courier Prime, monospace' : 'Inter, sans-serif'),
                                        ['--primary-color' as any]: documentDesign.primaryColor,
                                        ['--secondary-color' as any]: documentDesign.secondaryColor
                                    }}
                                    title="Klik ganda untuk mengedit langsung"
                                >
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide margin-0">{activeBlock.title}</h3>
                                        <span className="text-[10px] text-slate-400 font-semibold italic flex items-center">
                                            ✏️ Klik untuk Mengedit
                                        </span>
                                    </div>
                                    <div>
                                        <div 
                                            dangerouslySetInnerHTML={{ 
                                                __html: (window as any).marked ? (window as any).marked.parse(activeBlock.content || '') : activeBlock.content 
                                            }} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic text-center mt-20">Pilih salah satu blok dari daftar outline sebelah kiri.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden transition-colors duration-300 ${
            darkMode ? 'bg-slate-950 text-slate-100' : 'bg-mesh-gradient text-slate-800'
        }`}>
            {/* Glowing background circles for depth */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] blur-[110px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-teal-500/[0.04] dark:bg-teal-500/[0.02] blur-[110px] pointer-events-none" />

            <div className="w-full max-w-5xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/60 dark:border-slate-800/40 relative z-10 transition-all duration-300">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 md:gap-2">
                        <div className="flex items-start space-x-3.5">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-2xl flex-shrink-0 mt-1 shadow-lg shadow-emerald-500/10 text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-heading font-extrabold text-slate-800 dark:text-white flex flex-wrap items-center gap-2">
                                    Aplikasi Modul Ajar - APMA
                                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-450 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 font-bold tracking-wide shadow-sm">v1.1</span>
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Penyusun Modul Berbasis Deep Learning & Regulasi Terkini Kemendikdasmen</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 self-end md:self-auto">
                            {/* Dark Mode Switch */}
                            <button 
                                onClick={() => setDarkMode(!darkMode)}
                                className="flex-shrink-0 flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title={darkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
                            >
                                {darkMode ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                                )}
                            </button>
                            <button 
                                onClick={() => setShowApiKeyInput(prev => !prev)} 
                                className={`flex items-center space-x-1.5 text-xs font-bold p-1.5 px-2.5 rounded-xl transition-colors ${
                                    showApiKeyInput || !hasApiKey 
                                        ? 'text-amber-700 hover:text-amber-800 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-200/50 dark:border-amber-900/30' 
                                        : 'text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                                <span>API Key</span>
                            </button>
                            <button onClick={() => setShowHelp(true)} className="flex-shrink-0 flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold p-1.5 px-2.5 rounded-xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                                <span>Panduan</span>
                            </button>
                            {step === 3 && (
                                <button onClick={reset} className="text-xs bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                                    Mulai Baru
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Timeline */}
                <div className="px-5 sm:p-5 py-4 bg-slate-50/30 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative flex justify-between items-center max-w-xl mx-auto">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-slate-200 dark:bg-slate-800 rounded-full" />
                        <div 
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-in-out" 
                            style={{ width: `${((step - 1) / 2) * 100}%` }}
                        />
                        
                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                step >= 1 
                                    ? 'bg-emerald-600 dark:bg-emerald-555 text-white shadow-md shadow-emerald-500/10' 
                                    : 'bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-600 border-2 border-slate-200 dark:border-slate-800'
                             }`}>
                                {step > 1 ? '✓' : '1'}
                            </div>
                            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${step >= 1 ? 'text-emerald-700 dark:text-emerald-450' : 'text-slate-400 dark:text-slate-600'}`}>
                                Identitas Dasar
                            </span>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                step >= 2 
                                    ? 'bg-emerald-600 dark:bg-emerald-555 text-white shadow-md shadow-emerald-500/10' 
                                    : 'bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-600 border-2 border-slate-200 dark:border-slate-800'
                             }`}>
                                {step > 2 ? '✓' : '2'}
                            </div>
                            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${step >= 2 ? 'text-emerald-700 dark:text-emerald-450' : 'text-slate-400 dark:text-slate-600'}`}>
                                Detail Pembelajaran
                            </span>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                step >= 3 
                                    ? 'bg-emerald-600 dark:bg-emerald-555 text-white shadow-md shadow-emerald-500/10' 
                                    : 'bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-600 border-2 border-slate-200 dark:border-slate-800'
                             }`}>
                                3
                            </div>
                            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${step >= 3 ? 'text-emerald-700 dark:text-emerald-450' : 'text-slate-400 dark:text-slate-600'}`}>
                                Workspace Editor
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-5 sm:p-7">
                    {/* API Key Configuration Card */}
                    {(showApiKeyInput || !hasApiKey) && (
                        <div className="mb-6 p-4.5 bg-gradient-to-r from-amber-50/70 to-orange-50/70 border border-amber-200/80 rounded-2xl animate-fade-in shadow-sm">
                            <h4 className="font-bold text-amber-800 text-xs sm:text-sm flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                                <span>Konfigurasi API Key Gemini</span>
                            </h4>
                            <p className="text-[11px] text-amber-700 mt-1 mb-3">
                                {!hasApiKey 
                                    ? "API Key tidak terdeteksi. Silakan masukkan API Key Gemini Anda (didapatkan gratis di Google AI Studio) untuk mulai menyusun Modul Ajar."
                                    : "API Key terdeteksi aktif dari environment. Anda bisa menimpanya dengan memasukkan API Key kustom di bawah ini jika diperlukan:"
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="password"
                                    placeholder={hasApiKey ? "••••••••••••••••••••••••••••••••••••" : "Masukkan API Key Gemini (AIzaSy...)"}
                                    className="flex-1 p-2.5 text-xs rounded-xl border border-amber-250 outline-none bg-white text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                                    value={customApiKey}
                                    onChange={e => setCustomApiKey(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            if (customApiKey.trim()) {
                                                localStorage.setItem('GEMINI_API_KEY', customApiKey.trim());
                                                setHasApiKey(true);
                                                setShowApiKeyInput(false);
                                                alert('API Key berhasil disimpan!');
                                            } else {
                                                localStorage.removeItem('GEMINI_API_KEY');
                                                setHasApiKey(!!getApiKey());
                                                setShowApiKeyInput(false);
                                                alert('API Key kustom dihapus (kembali menggunakan key bawaan).');
                                            }
                                        }}
                                        className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                                    >
                                        Simpan
                                    </button>
                                    {localStorage.getItem('GEMINI_API_KEY') && (
                                        <button 
                                            onClick={() => {
                                                localStorage.removeItem('GEMINI_API_KEY');
                                                setCustomApiKey('');
                                                setHasApiKey(!!getApiKey());
                                                setShowApiKeyInput(false);
                                                alert('API Key kustom berhasil dihapus.');
                                            }}
                                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors"
                                        >
                                            Hapus
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="relative min-h-[300px]">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                    </div>

                    {step < 3 && (
                        <div className="mt-8 flex justify-between">
                            <button 
                                onClick={handleBack} 
                                className={`bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all duration-200 ${step === 1 ? 'invisible' : ''}`}
                            >
                                <span>Kembali</span>
                            </button>
                            <button 
                                onClick={handleNext} 
                                className="btn-premium-action bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-sm hover:bg-emerald-500"
                            >
                                <span>{step === 2 ? 'Rakit Modul Ajar (AI)' : 'Selanjutnya'}</span>
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="text-center p-3 bg-slate-50/50 border-t border-slate-100 text-[10px] text-slate-400">
                    &copy; 2026 IRSYAD MSK. Version 1.0
                </div>
            </div>

            {/* Help / Regulation Database Modal */}
            {showHelp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up border border-slate-100">
                        <div className="p-5 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                📚 Basis Data Regulasi & Glosarium Nomenklatur
                            </h3>
                            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-655 text-3xl font-light leading-none p-1">&times;</button>
                        </div>
                        <div className="p-6 space-y-6 text-slate-600 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">Kamus Pembaruan Istilah Kemendikdasmen</h4>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="p-2.5 font-bold text-slate-700">Istilah Lama</th>
                                                <th className="p-2.5 font-bold text-slate-700">Istilah Baru</th>
                                                <th className="p-2.5 font-bold text-slate-700">Dasar Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-150">
                                            {REGULATORY_GLOSSARY.filter((v, i, self) => self.findIndex(t => t.newTerm === v.newTerm) === i).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="p-2.5 text-slate-500 font-semibold">{item.oldTerm}</td>
                                                    <td className="p-2.5 text-emerald-700 font-bold">{item.newTerm}</td>
                                                    <td className="p-2.5 text-[11px] text-slate-550">{item.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-emerald-50/40 p-4.5 rounded-2xl border border-emerald-150">
                                <h4 className="font-bold text-emerald-800 text-xs uppercase tracking-wider mb-2">Pilar Pendekatan Pembelajaran Mendalam (Deep Learning)</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs text-slate-700">
                                    <li><strong>Mindful Learning:</strong> Mengembangkan kesadaran penuh dalam proses belajar, menghargai keunikan cara pandang siswa.</li>
                                    <li><strong>Meaningful Learning:</strong> Menghubungkan konsep materi secara mendalam dengan kehidupan sehari-hari siswa agar relevan.</li>
                                    <li><strong>Joyful Learning:</strong> Memunculkan kegembiraan internal siswa dalam memahami kebenaran ilmiah, bukan sekadar hiburan kosong.</li>
                                </ul>
                            </div>

                            <div className="bg-blue-55/30 p-4.5 rounded-2xl border border-blue-150">
                                <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider mb-2">Panduan Asesmen & Kelayakan Administrasi</h4>
                                <p className="text-xs text-slate-650 leading-relaxed">
                                    Menurut panduan kurikulum terbaru, Rencana Asesmen diagnostik awal sangat krusial untuk menentukan kesiapan belajar murid. Rangkaian aktivitas inti harus memiliki indikator kriteria ketercapaian tujuan pembelajaran (KKTP) yang jelas agar evaluasi formatif dan sumatif dapat mengukur capaian secara sahih.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-150 text-right rounded-b-3xl">
                            <button onClick={() => setShowHelp(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-md">Mengerti</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Visual Compare Version History Modal */}
            {showCompareModal && compareVersion && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up border border-slate-100">
                        <div className="p-5 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-base font-bold text-slate-800">
                                🔄 Perbandingan Revisi Dokumen (Sisi ke Sisi)
                            </h3>
                            <button onClick={() => setShowCompareModal(false)} className="text-slate-400 hover:text-slate-655 text-3xl font-light leading-none p-1">&times;</button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* Version A */}
                            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                                <h4 className="font-bold text-slate-500 text-xs uppercase mb-2">Versi Pembanding: {compareVersion.label}</h4>
                                <div className="space-y-4">
                                    {compareVersion.blocks.map(b => (
                                        <div key={b.id} className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
                                            <strong className="block border-b pb-1 text-slate-855 mb-1.5">{b.title}</strong>
                                            <div className="text-[11px] text-slate-600 line-clamp-6">{b.content.substring(0, 300)}...</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Version B */}
                            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/10">
                                <h4 className="font-bold text-emerald-800 text-xs uppercase mb-2">Versi Saat Ini</h4>
                                <div className="space-y-4">
                                    {blocks.map(b => (
                                        <div key={b.id} className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
                                            <strong className="block border-b pb-1 text-slate-855 mb-1.5">{b.title}</strong>
                                            <div className="text-[11px] text-slate-600 line-clamp-6">{b.content.substring(0, 300)}...</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-150 text-right rounded-b-3xl">
                            <button onClick={() => setShowCompareModal(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-md">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}