export interface SchoolProfile {
    logoUrl?: string; // base64 data URL
    namaSekolah: string;
    alamat: string;
    npsn: string;
    nss: string;
    kepalaSekolah: string;
    namaGuru: string;
}

export interface DocumentDesign {
    theme: 'formal' | 'minimalis' | 'modern' | 'islami' | 'colorful' | 'mono';
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    marginSize: 'normal' | 'narrow' | 'wide';
    headerText: string;
    footerText: string;
    showCover: boolean;
    useIcons: boolean;
    showPageNumbers: boolean;
}

export interface ModuleBlock {
    id: string;
    title: string;
    category: 'Informasi Umum' | 'Komponen Inti' | 'Lampiran';
    content: string; // Markdown content
}

export interface VersionHistoryItem {
    id: string;
    timestamp: string;
    label: string;
    blocks: ModuleBlock[];
    formData: AppFormData;
    score: number;
}

export interface AppFormData {
    // A. Informasi Umum
    namaGuru: string;
    institusi: string;
    tahun: string;
    jenjang: string;
    kelas: string;
    fase: string;
    semester: string;
    mapel: string;
    elemen: string;
    cp: string;
    alokasi?: string;
    karakteristikMurid: string; // replaces target peserta didik
    kesiapanBelajar: string; // replaces kompetensi awal
    saranaPrasarana: string;
    model: string;
    pendekatan: string;
    metode: string;
    strategi: string;
    media: string;
    sumberBelajar: string;
    
    // Curriculum & KBC
    kurikulum: string; // 'kumer' | 'kbc' | 'khas' | 'yayasan'
    customKurikulumName?: string;
    topikPancaCinta: string[];
    materiInsersi: string[];
    
    // Profil Lulusan
    profilLulusan: string[];

    // Step 2 & Details
    materi: string;
    jumlahPertemuan: number;
    lamaWaktu: string;
    isDaring: boolean;
    
    // Calculated/Formatted
    durasiPendahuluanPerSesi?: string;
    durasiIntiPerSesi?: string;
    durasiPenutupPerSesi?: string;

    // File Upload
    uploadedText?: string | null;
    uploadedImage?: {
        mimeType: string;
        data: string;
    } | null;

    // Settings Profile & Design
    schoolProfile?: SchoolProfile;
    documentDesign?: DocumentDesign;
}

export const KBC_DATA: Record<string, string[]> = {
    "Cinta Allah dan Rasul-Nya": [
        "Keimanan dan ketakwaan kepada Allah Swt. sebagai inti dan muara kehidupan.",
        "Mengenal Asmaul Husna untuk meneladani sifat-sifat mulia Allah Swt.",
        "Ibadah sebagai wujud cinta kepada Allah Swt.",
        "Mensyukuri nikmat Allah Swt. melalui rasa syukur dalam perilaku sehari-hari.",
        "Sejarah kehidupan Rasulullah saw. (Sirah Nabawiyah).",
        "Mempraktikkan sifat-sifat Rasulullah.",
        "Mempelajari hadis-hadis yang mengajarkan cinta dan akhlak mulia."
    ],
    "Cinta Ilmu": [
        "Pilar sukses mencari ilmu: niat, tekun, tawakal, wara', yakin, dan syukur.",
        "Alat transformasi sosial dan global",
        "Literasi sebagai sumber ilmu",
        "Pembelajar sepanjang hayat",
        "Adab kepada guru",
        "Pemanfaatan teknologi",
        "Inovasi dan penalaran kritis",
        "Ilmu penuntun keseimbangan hidup",
        "Ilmu dalam konteks keberagaman sejarah, sosial, budaya",
        "Sumber ilmu (qauliyah dan kauniyah)."
    ],
    "Cinta Lingkungan": [
        "Penguatan bahwa Islam sebagai agama rahmatan lil 'alamin.",
        "Adab pada alam dan lingkungan.",
        "Menghindari fasad. Larangan merusak lingkungan.",
        "Praktik menjaga kebersihan (thaharah) dan hemat energi."
    ],
    "Cinta Diri dan Sesama Manusia": [
        "Membiasakan akhlak terpuji kepada diri sendiri.",
        "Menghindari akhlak tercela kepada diri sendiri.",
        "Membiasakan diri menjaga kebersihan, kesehatan, dan keselamatan diri.",
        "Ajaran Islam tentang ukhuwah Islamiyah and ukhuwah insaniyah.",
        "Adab kepada orangtua.",
        "Adab kepada saudara.",
        "Adab kepada tetangga.",
        "Adab kepada teman.",
        "Adab kepada sesama umat beragama maupun antarumat agama.",
        "Memahami akhlak terpuji kepada sesama.",
        "Memahami akhlak tercela kepada sesama."
    ],
    "Cinta Tanah Air": [
        "Ajaran Islam tentang ukhuwah wathaniyah.",
        "Konsep cinta tanah air dalam Islam (Hubbul Wathan minal Iman).",
        "Menghormati perbedaan suku, budaya, dan agama dalam bingkai persatuan.",
        "Menjaga kedaulatan dan keamanan negara."
    ]
};

export const FASE_MAPPING: Record<string, string[]> = {
    "PAUD": ["Fondasi"],
    "TK": ["Fondasi"],
    "SD": ["A", "B", "C"],
    "SMP": ["D"],
    "SMA": ["E", "F"],
    "SMK": ["E", "F"],
    "SD-LB": ["A", "B", "C"],
    "SMP-LB": ["D"],
    "SMA-LB": ["E", "F"],
    "Kesetaraan": ["A", "B", "C", "D", "E", "F"],
    "RA": ["Fondasi"],
    "MI": ["A", "B", "C"],
    "MTS": ["D"],
    "MA": ["E", "F"],
    "MAK": ["E", "F"],
    "MI-LB": ["A", "B", "C"],
    "MTs-LB": ["D"],
    "MA-LB": ["E", "F"]
};

export const JENJANG_OPTIONS = {
    kumer: ["PAUD", "TK", "SD", "SMP", "SMA", "SMK", "SD-LB", "SMP-LB", "SMA-LB", "Kesetaraan"],
    kbc: ["PAUD", "RA", "MI", "MTS", "MA", "MAK", "MI-LB", "MTs-LB", "MA-LB"],
    khas: ["PAUD", "TK", "SD", "SMP", "SMA", "SMK"],
    yayasan: ["PAUD", "TK", "SD", "SMP", "SMA", "SMK"]
};

export const FASE_DESCRIPTIONS: Record<string, string> = {
    "Fondasi": "Fondasi (PAUD/TK/RA)",
    "A": "A (Kelas 1-2 SD/MI)",
    "B": "B (Kelas 3-4 SD/MI)",
    "C": "C (Kelas 5-6 SD/MI)",
    "D": "D (Kelas 7-9 SMP/MTS)",
    "E": "E (Kelas 10 SMA/MA/SMK)",
    "F": "F (Kelas 11-12 SMA/MA/SMK)"
};