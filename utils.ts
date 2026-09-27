import { AppFormData, ModuleBlock, DocumentDesign } from "./types";

// --- FILE HELPERS ---

export const handleFileUpload = async (file: File): Promise<{ text: string | null; image: { mimeType: string; data: string } | null }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        if (file.type === 'application/pdf') {
             const pdfjsLib = (window as any).pdfjsLib;
             if (!pdfjsLib) {
                 reject(new Error("PDF.js library not loaded"));
                 return;
             }
             
             reader.onload = async function() {
                 try {
                     const typedarray = new Uint8Array(this.result as ArrayBuffer);
                     const pdf = await pdfjsLib.getDocument(typedarray).promise;
                     let fullText = "";
                     const maxPages = pdf.numPages;
                     for (let i = 1; i <= maxPages; i++) {
                         const page = await pdf.getPage(i);
                         const textContent = await page.getTextContent();
                         const pageText = textContent.items.map((item: any) => item.str).join(' ');
                         fullText += `\n--- Page ${i} ---\n${pageText}`;
                     }
                     resolve({ text: fullText, image: null });
                 } catch (e) {
                     reject(e);
                 }
             };
             reader.readAsArrayBuffer(file);

        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const mammoth = (window as any).mammoth;
            if (!mammoth) {
                reject(new Error("Mammoth library not loaded"));
                return;
            }
             reader.onload = async function(e) {
                try {
                    const arrayBuffer = (e.target as FileReader).result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve({ text: result.value, image: null });
                } catch(err) {
                    reject(err);
                }
             }
             reader.readAsArrayBuffer(file);

        } else if (file.type === 'image/jpeg' || file.type === 'image/png') {
            reader.onload = function(e) {
                const base64String = (e.target as FileReader).result?.toString().split(',')[1];
                if (base64String) {
                    resolve({ 
                        text: null, 
                        image: { mimeType: file.type, data: base64String } 
                    });
                } else {
                    reject(new Error("Failed to process image"));
                }
            };
            reader.readAsDataURL(file);
        } else {
            reject(new Error("Unsupported file type"));
        }
    });
};

export const exportToDOCX = (htmlContent: string, filename: string) => {
    const htmlDocx = (window as any).htmlDocx;
    if (!htmlDocx) {
        throw new Error("Pustaka export Word (html-docx-js) belum termuat. Periksa koneksi internet Anda lalu muat ulang halaman.");
    }

    const head = `
        <meta charset='UTF-8'>
        <style>
            body { font-family: 'Inter', sans-serif; font-size: 11pt; color: #1f2937; }
            h1, h2, h3, h4, strong { color: #1f2937; }
            h1 { font-size: 16pt; text-align: center; }
            h2 { font-size: 14pt; text-align: center; }
            h3 { font-size: 12pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 24px; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f9fafb; }
            td:first-child { font-weight: bold; }
            ul, ol { padding-left: 20px; }
            br { display: none; }
        </style>
    `;
    const content = `<!DOCTYPE html><html><head>${head}</head><body>${htmlContent}</body></html>`;
    const converted = htmlDocx.asBlob(content, {
        orientation: 'portrait',
        margins: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
    });
    
    const url = URL.createObjectURL(converted);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Modul Ajar - ${filename || 'Generated'}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToHTML = (htmlContent: string, filename: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Modul Ajar - ${filename || 'Generated'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToMarkdown = (markdownContent: string, filename: string) => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Modul Ajar - ${filename || 'Generated'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToODT = (htmlContent: string, filename: string) => {
    // Basic ODT wrapping HTML with appropriate MIME type
    const blob = new Blob([htmlContent], { type: 'application/vnd.oasis.opendocument.text;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Modul Ajar - ${filename || 'Generated'}.odt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- REGULATORY GLOSSARY & REPLACEMENT ---

export const REGULATORY_GLOSSARY: { oldTerm: string; newTerm: string; description: string }[] = [
    { oldTerm: 'Peserta Didik', newTerm: 'Murid', description: 'Istilah terbaru dari Kemendikdasmen untuk memanusiakan hubungan belajar.' },
    { oldTerm: 'peserta didik', newTerm: 'murid', description: 'Istilah terbaru dari Kemendikdasmen untuk memanusiakan hubungan belajar.' },
    { oldTerm: 'IKTP', newTerm: 'KKTP', description: 'Kriteria Ketercapaian Tujuan Pembelajaran menggantikan Indikator Ketercapaian.' },
    { oldTerm: 'iktp', newTerm: 'kktp', description: 'Kriteria Ketercapaian Tujuan Pembelajaran menggantikan Indikator Ketercapaian.' },
    { oldTerm: 'P5', newTerm: 'Kokurikuler', description: 'Proyek Penguatan Profil Pelajar Pancasila sekarang diintegrasikan sebagai Kegiatan Kokurikuler.' },
    { oldTerm: 'p5', newTerm: 'kokurikuler', description: 'Proyek Penguatan Profil Pelajar Pancasila sekarang diintegrasikan sebagai Kegiatan Kokurikuler.' },
    { oldTerm: 'Profil Pelajar Pancasila', newTerm: 'Dimensi Profil Lulusan', description: 'Nomenklatur standar kelulusan terbaru sesuai SKL Kemendikdasmen.' },
    { oldTerm: 'profil pelajar pancasila', newTerm: 'dimensi profil lulusan', description: 'Nomenklatur standar kelulusan terbaru sesuai SKL Kemendikdasmen.' },
    { oldTerm: 'Kompetensi Awal', newTerm: 'Kesiapan Belajar Murid', description: 'Menggambarkan kondisi kognitif awal siswa secara lebih humanis.' },
    { oldTerm: 'kompetensi awal', newTerm: 'kesiapan belajar murid', description: 'Menggambarkan kondisi kognitif awal siswa secara lebih humanis.' },
    { oldTerm: 'Target Peserta Didik', newTerm: 'Karakteristik Murid', description: 'Nomenklatur terbaru untuk klasifikasi kesiapan belajar siswa.' },
    { oldTerm: 'target peserta didik', newTerm: 'karakteristik murid', description: 'Nomenklatur terbaru untuk klasifikasi kesiapan belajar siswa.' }
];

export const replaceRegulatoryTerms = (text: string): string => {
    if (!text) return text;
    let result = text;
    // Sort terms by length descending to avoid partial replacements (e.g. "Target Peserta Didik" containing "Peserta Didik")
    const sortedGlossary = [...REGULATORY_GLOSSARY].sort((a, b) => b.oldTerm.length - a.oldTerm.length);
    for (const item of sortedGlossary) {
        const regex = new RegExp(item.oldTerm, 'g');
        result = result.replace(regex, item.newTerm);
    }
    return result;
};

// --- VISUAL DESIGN STYLES ---

export const getThemeStyles = (design: DocumentDesign) => {
    const { theme, primaryColor, secondaryColor, fontFamily, marginSize } = design;

    let fontClass = 'font-sans';
    if (fontFamily === 'Times New Roman' || fontFamily === 'serif') fontClass = 'font-serif';
    if (fontFamily === 'Courier New' || fontFamily === 'mono') fontClass = 'font-mono';

    let marginPadding = 'p-8 sm:p-12';
    if (marginSize === 'narrow') marginPadding = 'p-4 sm:p-6';
    if (marginSize === 'wide') marginPadding = 'p-10 sm:p-16';

    let themeStyles = '';
    switch (theme) {
        case 'formal':
            themeStyles = `
                background-color: #ffffff;
                color: #0f172a;
                border: 2px solid #1e293b;
                box-shadow: none;
                --primary: ${primaryColor || '#1e293b'};
                --secondary: ${secondaryColor || '#475569'};
            `;
            break;
        case 'minimalis':
            themeStyles = `
                background-color: #ffffff;
                color: #334155;
                box-shadow: none;
                --primary: ${primaryColor || '#0f172a'};
                --secondary: ${secondaryColor || '#64748b'};
            `;
            break;
        case 'modern':
            themeStyles = `
                background-color: #ffffff;
                color: #1e293b;
                border-radius: 24px;
                box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.08);
                border: 1px solid #f1f5f9;
                --primary: ${primaryColor || '#059669'};
                --secondary: ${secondaryColor || '#0d9488'};
            `;
            break;
        case 'islami':
            themeStyles = `
                background-color: #fcfbf7;
                color: #1b2e22;
                border-top: 10px solid ${primaryColor || '#065f46'};
                border-bottom: 10px solid ${primaryColor || '#065f46'};
                border-radius: 8px;
                box-shadow: 0 4px 20px -2px rgba(6, 95, 70, 0.05);
                --primary: ${primaryColor || '#065f46'};
                --secondary: ${secondaryColor || '#d97706'};
            `;
            break;
        case 'colorful':
            themeStyles = `
                background-color: #faf5ff;
                color: #1e1b4b;
                border: 3px solid ${primaryColor || '#8b5cf6'};
                border-radius: 24px;
                box-shadow: 0 8px 30px rgba(139, 92, 246, 0.08);
                --primary: ${primaryColor || '#8b5cf6'};
                --secondary: ${secondaryColor || '#ec4899'};
            `;
            break;
        case 'mono':
            themeStyles = `
                background-color: #ffffff;
                color: #000000;
                border: 1px solid #000000;
                box-shadow: none;
                --primary: #000000;
                --secondary: #000000;
            `;
            break;
    }

    return { fontClass, marginPadding, themeStyles };
};

// --- PARSE GENERATED BLOCKS ---

export const parseGeneratedBlocks = (rawText: string): ModuleBlock[] => {
    const blocks: ModuleBlock[] = [];
    
    // Strict block parsing regex to look for marker structures
    const regex = /=== START_BLOCK: ([\s\S]*?) \[(Informasi Umum|Komponen Inti|Lampiran)\] ===([\s\S]*?)(=== END_BLOCK ===|==== END_BLOCK ====|\n=== END_BLOCK ===|$)/g;
    let match;
    let index = 1;

    while ((match = regex.exec(rawText)) !== null) {
        const title = match[1].trim();
        const category = match[2] as ModuleBlock['category'];
        const content = match[3].trim();
        blocks.push({
            id: `block-${index++}-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            title,
            category,
            content
        });
    }

    // Fallback if formatting was slightly missed but headers exist
    if (blocks.length === 0) {
        console.warn("Block parsing markers not found in AI response. Initiating fallback parsing...");
        // Split by standard section headers
        const sections = rawText.split(/(?=### [A-C]\. )/g);
        sections.forEach((sec, sIdx) => {
            const lines = sec.split('\n');
            const secTitle = lines[0].replace('###', '').trim();
            const cat = secTitle.includes('Informasi Umum') ? 'Informasi Umum' : 
                        (secTitle.includes('Lampiran') ? 'Lampiran' : 'Komponen Inti');
            
            // Subdivide by subheadings
            const subSecs = sec.split(/(?=#### |\*\*1\. |\*\*2\. |\*\*3\. |\*\*4\. |\*\*5\. |\*\*6\. |\*\*7\. )/g);
            subSecs.forEach((sub, subIdx) => {
                const subLines = sub.trim().split('\n');
                let title = subLines[0].replace(/[#*0-9.]/g, '').trim();
                if (!title || title.length > 50) title = `Bagian ${sIdx + 1}.${subIdx + 1}`;
                
                blocks.push({
                    id: `block-fallback-${sIdx}-${subIdx}-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title,
                    category: cat,
                    content: sub.trim()
                });
            });
        });
    }
    
    return blocks;
};

// --- PROMPT ASSEMBLY FOR MAIN GENERATOR ---

export const assemblePrompt = (formData: AppFormData): string => {
    const isLB = formData.jenjang && formData.jenjang.includes('LB');
    
    // Select curriculum details
    let kurikulumName = "Kurikulum Merdeka (Nasional)";
    if (formData.kurikulum === 'kbc') kurikulumName = "Kurikulum Berbasis Cinta (Kemenag)";
    if (formData.kurikulum === 'khas') kurikulumName = `Kurikulum Khas Sekolah (${formData.customKurikulumName || 'Kustom'})`;
    if (formData.kurikulum === 'yayasan') kurikulumName = `Kurikulum Yayasan (${formData.customKurikulumName || 'Kustom'})`;

    let modelSyntaxInstruction = '';
    switch (formData.model) {
        case 'Project Based Learning (PjBL)':
            modelSyntaxInstruction = `Sintaks PjBL wajib muncul secara runtut dalam Kegiatan Inti: 1. Pertanyaan Mendasar, 2. Mendesain Perencanaan Proyek, 3. Menyusun Jadwal, 4. Memonitor Kemajuan Proyek, 5. Menguji Hasil, dan 6. Mengevaluasi Pengalaman.`;
            break;
        case 'Problem Based Learning (PBL)':
            modelSyntaxInstruction = `Sintaks PBL wajib muncul secara runtut dalam Kegiatan Inti: 1. Orientasi murid pada masalah, 2. Mengorganisasikan murid untuk belajar, 3. Membimbing penyelidikan individu/kelompok, 4. Mengembangkan & menyajikan hasil karya, 5. Menganalisis & mengevaluasi proses pemecahan masalah.`;
            break;
        case 'Case Based Learning (CBL)':
            modelSyntaxInstruction = `Sintaks CBL wajib muncul secara runtut: 1. Penyajian Kasus, 2. Analisis Kasus, 3. Diskusi/Pencarian Solusi Kelompok, 4. Presentasi Hasil, 5. Refleksi dan Evaluasi.`;
            break;
        case 'Discovery Learning':
            modelSyntaxInstruction = `Sintaks Discovery Learning wajib muncul secara runtut: 1. Stimulation, 2. Problem Statement, 3. Data Collection, 4. Data Processing, 5. Verification, 6. Generalization.`;
            break;
        case 'Inquiry Learning':
            modelSyntaxInstruction = `Sintaks Inquiry Learning wajib muncul secara runtut: 1. Orientasi masalah, 2. Merumuskan masalah, 3. Merumuskan hipotesis, 4. Mengumpulkan data, 5. Menguji hipotesis, 6. Merumuskan kesimpulan.`;
            break;
        case 'Deep Learning':
            modelSyntaxInstruction = `Model Pembelajaran Mendalam (Deep Learning): Desain langkah yang menekankan 3 pilar: Mindful Learning (Belajar Sadar), Meaningful Learning (Belajar Bermakna), dan Joyful Learning (Belajar Menyenangkan). Tidak ada sintaks kaku, melainkan elaborasi kedalaman materi.`;
            break;
        default:
            modelSyntaxInstruction = `Gunakan sintaks yang valid untuk model "${formData.model}" dan tunjukkan langkah pembelajarannya secara eksplisit.`;
    }

    // Dimensi Profil Lulusan
    const profilLulusanStr = formData.profilLulusan.join(', ');

    // KBC Integration Text
    let kbcInstruction = '';
    if (formData.kurikulum === 'kbc' && formData.topikPancaCinta.length > 0 && formData.materiInsersi.length > 0) {
        kbcInstruction = `
[KURIKULUM BERBASIS CINTA - WAJIB INTEGRASI]
Tema Panca Cinta yang dipilih: ${formData.topikPancaCinta.join(', ')}
Materi Insersi KBC:
${formData.materiInsersi.map(ins => `- ${ins}`).join('\n')}
Integrasikan nilai-nilai cinta di atas ke dalam Tujuan Pembelajaran, Pemahaman Bermakna, Pertanyaan Pemantik, serta Kegiatan Pembelajaran.
`;
    }

    // Custom/Yayasan Curriculum Integration Text
    let customCurriculumInstruction = '';
    if ((formData.kurikulum === 'khas' || formData.kurikulum === 'yayasan') && formData.customKurikulumName) {
        customCurriculumInstruction = `
[KURIKULUM KHAS/YAYASAN - INTEGRASI]
Nama Kurikulum: ${formData.customKurikulumName}
Pastikan modul ajar mengadopsi nilai-nilai khas kurikulum "${formData.customKurikulumName}" (karakter kepemimpinan, keagamaan, kemandirian, dll.) dalam tujuan, pemahaman bermakna, dan langkah kegiatan.
`;
    }

    // File Upload Instruction
    let fileUploadInstruction = '';
    if (formData.uploadedText) {
        fileUploadInstruction = `
[SUMBER UTAMA PEMBELAJARAN DARI DOKUMEN PENGGUNA]
Gunakan teks di bawah ini sebagai sumber rujukan utama materi, istilah, dan aktivitas:
\"\"\"
${formData.uploadedText}
\"\"\"
`;
    } else if (formData.uploadedImage) {
        fileUploadInstruction = `
[SUMBER UTAMA PEMBELAJARAN DARI FOTO BUKU TEKS]
Foto halaman buku teks terlampir. Analisis foto tersebut dan gunakan kontennya sebagai rujukan utama materi pembelajaran Anda.
`;
    }

    // SLB Adaptation
    let slbInstruction = '';
    if (isLB) {
        slbInstruction = `
[ADAPTASI PENDIDIKAN KHUSUS (LB)]
Karena jenjang yang dipilih adalah ${formData.jenjang}, lakukan simplifikasi bahasa, gunakan pendekatan konkret visual, batasi durasi aktivitas agar tidak berlebihan, dan buat instrumen asesmen yang bersifat observasi praktis.
`;
    }

    // School Profile Template insertion
    let schoolProfileHeader = '';
    if (formData.schoolProfile) {
        const sp = formData.schoolProfile;
        schoolProfileHeader = `
[IDENTITAS SEKOLAH]
Nama Sekolah: ${sp.namaSekolah}
Alamat: ${sp.alamat}
NPSN: ${sp.npsn} | NSS: ${sp.nss}
Kepala Sekolah: ${sp.kepalaSekolah}
`;
    }

    // Render Pertemuan Loop
    let kegiatanPembelajaranOutput = '';
    const jumlahPertemuan = formData.jumlahPertemuan || 1;
    for (let i = 1; i <= jumlahPertemuan; i++) {
        kegiatanPembelajaranOutput += `
=== START_BLOCK: Kegiatan Pembelajaran Pertemuan Ke-${i} [Komponen Inti] ===
#### Pertemuan Ke-${i}
Alokasi Waktu: ${formData.lamaWaktu}
*   **Pendahuluan (${formData.durasiPendahuluanPerSesi || '10 menit'}):**
    * Apersepsi & Motivasi (Masukkan prinsip Mindful/Joyful Learning)
    * Penyampaian tujuan dan pertanyaan pemantik
*   **Kegiatan Inti (${formData.durasiIntiPerSesi || '40 menit'}):**
    * Rincian langkah-langkah berdasarkan model: ${formData.model}
    * ${modelSyntaxInstruction}
    * Integrasikan prinsip Deep Learning (Meaningful & Kolaboratif)
*   **Penutup (${formData.durasiPenutupPerSesi || '10 menit'}):**
    * Refleksi singkat murid, kesimpulan bersama, tindak lanjut/penugasan mandiri.
=== END_BLOCK ===
`;
    }

    // Combined instructions for strict format output
    return `
Anda adalah seorang Ahli Kurikulum Kemendikdasmen dan Guru Ahli dengan spesialisasi pengembangan bahan ajar.
Buat Modul Ajar lengkap sesuai regulasi nomenklatur terbaru dengan menggunakan struktur blok khusus di bawah ini.

[PENTING - NOMENKLATUR TERBARU KEMENDIKDASMEN]
Anda WAJIB menggunakan istilah terbaru ini secara konsisten:
- Gunakan "Murid" (bukan "Peserta Didik")
- Gunakan "KKTP" / Kriteria Ketercapaian Tujuan Pembelajaran (bukan "IKTP")
- Gunakan "Kokurikuler" (bukan "P5")
- Gunakan "Dimensi Profil Lulusan" (bukan "Profil Pelajar Pancasila")
- Gunakan "Kesiapan Belajar Murid" (bukan "Kompetensi Awal")
- Gunakan "Karakteristik Murid" (bukan "Target Peserta Didik")

[INFORMASI UMUM MODUL]
- Guru Penyusun: ${formData.namaGuru}
- Institusi: ${formData.institusi}
- Tahun Ajaran: ${formData.tahun || '2025/2026'}
- Kurikulum: ${kurikulumName}
- Jenjang: ${formData.jenjang} | Kelas: ${formData.kelas} | Fase: ${formData.fase} | Semester: ${formData.semester || 'Ganjil'}
- Mata Pelajaran: ${formData.mapel} | Elemen: ${formData.elemen || '(Tentukan elemen kurikulum merdeka yang relevan)'}
- Capaian Pembelajaran (CP): ${formData.cp || '(Jabarkan CP sesuai regulasi terbaru untuk Fase ' + formData.fase + ')'}
- Alokasi Waktu: ${formData.alokasi}
- Karakteristik Murid: ${formData.karakteristikMurid || 'Siswa Reguler'}
- Kesiapan Belajar Murid: ${formData.kesiapanBelajar || 'Telah memahami materi dasar prasyarat'}
- Sarana & Prasarana: ${formData.saranaPrasarana || 'Laptop, Proyektor, Papan Tulis'}
- Model Pembelajaran: ${formData.model}
- Pendekatan: ${formData.pendekatan || 'Deep Learning'}
- Metode: ${formData.metode || 'Diskusi, Tanya Jawab, Ceramah Interaktif, Penugasan'}
- Strategi: ${formData.strategi || 'Pembelajaran Berdiferensiasi & Kolaboratif'}
- Media: ${formData.media || 'Slide PPT, Gambar Konseptual, Media Interaktif'}
- Sumber Belajar: ${formData.sumberBelajar || 'Buku Paket Kemendikdasmen, Internet, Lingkungan Sekitar'}
- Dimensi Profil Lulusan: ${profilLulusanStr}

${schoolProfileHeader}
${kbcInstruction}
${customCurriculumInstruction}
${fileUploadInstruction}
${slbInstruction}

Tugas Anda adalah menulis konten modul ajar dengan membaginya ke dalam blok-blok dengan pembatas strict "=== START_BLOCK: [Judul] [[Kategori]] ===" dan "=== END_BLOCK ===" agar aplikasi dapat mem-parsingnya ke dalam sistem block editor kami.

Daftar Blok yang HARUS Anda hasilkan (JANGAN ADA YANG TERLEWAT!):

=== START_BLOCK: Identitas & Informasi Umum [Informasi Umum] ===
Buatlah **tabel Markdown formal** dengan kolom `| Komponen | Keterangan |` untuk menyajikan rincian berikut:
- **Nama Guru Penyusun**: ${formData.namaGuru}
- **Institusi/Sekolah**: ${formData.institusi}
- **Tahun Ajaran**: ${formData.tahun || '2025/2026'}
- **Kurikulum**: ${kurikulumName}
- **Jenjang & Kelas**: ${formData.jenjang} / Kelas ${formData.kelas}
- **Fase & Semester**: Fase ${formData.fase} / Semester ${formData.semester || 'Ganjil'}
- **Mata Pelajaran**: ${formData.mapel}
- **Elemen Kurikulum**: ${formData.elemen || '(Tentukan elemen kurikulum merdeka yang relevan)'}
- **Capaian Pembelajaran (CP)**: ${formData.cp || '(Jabarkan CP sesuai regulasi terbaru)'}
- **Alokasi Waktu**: ${formData.alokasi}
- **Karakteristik Murid**: ${formData.karakteristikMurid || 'Siswa Reguler'}
- **Kesiapan Belajar Murid**: ${formData.kesiapanBelajar || 'Telah memahami materi dasar prasyarat'}
- **Sarana & Prasarana**: ${formData.saranaPrasarana || 'Laptop, Proyektor, Papan Tulis'}
- **Model Pembelajaran**: ${formData.model}
- **Pendekatan & Metode**: ${formData.pendekatan || 'Deep Learning'} & ${formData.metode || 'Diskusi, Tanya Jawab'}
- **Strategi & Media**: ${formData.strategi || 'Pembelajaran Berdiferensiasi'} & ${formData.media || 'Slide PPT'}
- **Sumber Belajar**: ${formData.sumberBelajar || 'Buku Paket Kemendikdasmen'}
- **Dimensi Profil Lulusan**: ${profilLulusanStr}
=== END_BLOCK ===

=== START_BLOCK: Tujuan Pembelajaran & KKTP [Komponen Inti] ===
- **Tujuan Pembelajaran:** (1-2 tujuan pembelajaran yang terukur secara kognitif, psikomotorik, maupun afektif).
- **Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):** (Sebutkan kriteria ketercapaian secara terukur, minimal 3 kriteria spesifik).
=== END_BLOCK ===

=== START_BLOCK: Pemahaman Bermakna & Pertanyaan Pemantik [Komponen Inti] ===
- **Pemahaman Bermakna:** (Kalimat bermakna yang dapat diaplikasikan murid dalam kehidupan nyata setelah belajar materi ini).
- **Pertanyaan Pemantik:** (Sediakan minimal 3 pertanyaan pemantik: 1 tingkat LOTS, 1 tingkat MOTS, dan 1 tingkat HOTS untuk merangsang berpikir kritis).
=== END_BLOCK ===

=== START_BLOCK: Rencana Asesmen [Komponen Inti] ===
- **Asesmen Diagnostik (Awal):** (Deskripsi instrumen/cara menilai kesiapan belajar murid di awal pertemuan).
- **Asesmen Formatif (Proses):** (Deskripsi teknik penilaian saat proses pembelajaran, misal lembar observasi diskusi atau kuis interaktif).
- **Asesmen Sumatif (Akhir):** (Deskripsi asesmen berupa penugasan produk/proyek atau tes tertulis untuk mengukur KKTP).
=== END_BLOCK ===

${kegiatanPembelajaranOutput}

=== START_BLOCK: Refleksi & Tindak Lanjut [Komponen Inti] ===
*   **Refleksi Murid:** (Berikan 2-3 pertanyaan refleksi diri murid menggunakan teknik refleksi yang kreatif).
*   **Refleksi Guru:** (Berikan 2 pertanyaan refleksi guru untuk mengevaluasi efektivitas mengajar).
*   **Rencana Tindak Lanjut:** (Langkah konkret tindak lanjut seperti remedial dan pengayaan).
=== END_BLOCK ===

=== START_BLOCK: Lampiran 1 - Lembar Kerja Murid (LKPD) [Lampiran] ===
**LEMBAR KERJA MURID (LKPD)**

Buatlah **tabel Markdown formal** dengan kolom \`| Komponen | Isi |\` untuk menyajikan identitas kegiatan berikut:
- **Nama Murid**: (kosongkan sebagai titik-titik isian)
- **Kelas**: (kosongkan sebagai titik-titik isian)
- **Kelompok**: (kosongkan sebagai titik-titik isian, jika kerja kelompok)
- **Tujuan Kegiatan**: (satu kalimat tujuan kegiatan LKPD yang terukur)
- **Alat & Bahan / Sumber Belajar**: (daftar alat/bahan/sumber yang relevan)

**Langkah Kegiatan:**
Buatlah **tabel Markdown bernomor** dengan kolom \`| No | Langkah Kegiatan | Catatan/Hasil Pengamatan Murid |\` berisi minimal 4-6 langkah kerja kolaboratif/penemuan mandiri yang runtut sesuai model pembelajaran ${formData.model}. Kolom "Catatan/Hasil Pengamatan Murid" dikosongkan sebagai ruang isian murid.

**Pertanyaan Analisis:**
Buatlah **tabel Markdown** dengan kolom \`| No | Pertanyaan Analisis (HOTS) | Jawaban Murid |\` berisi 2-3 pertanyaan analisis tingkat tinggi terkait percobaan/kasus. Kolom "Jawaban Murid" dikosongkan sebagai ruang isian.

**Kesimpulan:**
Sediakan bagian akhir berupa garis-garis kosong (gunakan tanda \`_______________________\` sebanyak 3 baris) sebagai ruang bagi murid untuk menuliskan kesimpulan secara tertulis.
=== END_BLOCK ===

=== START_BLOCK: Lampiran 2 - Rubrik Penilaian [Lampiran] ===
Buatlah **tabel rubrik penilaian lengkap** dalam format Markdown untuk menilai diskusi/proyek/presentasi dengan kolom:
\`| Kriteria Penilaian | Baru Berkembang (Skor 1) | Layak (Skor 2) | Cakap (Skor 3) | Mahir (Skor 4) |\`
Isi deskripsi masing-masing skor secara detail dan terukur, serta sertakan rumus/pedoman penentuan nilai akhir.
=== END_BLOCK ===

=== START_BLOCK: Lampiran 3 - Kisi-Kisi & Soal Asesmen [Lampiran] ===
*   **Kisi-Kisi Soal:** Buat **tabel Markdown** berisi kolom \`| No | Tujuan Pembelajaran / Indikator Soal | Level Kognitif | Bentuk Soal | Skor |\`.
*   **Soal Formatif & Sumatif:** Sediakan minimal 3 Soal Pilihan Ganda & 2 Soal Uraian HOTS (berbasis stimulus kontekstual).
*   **Kunci Jawaban & Pedoman Penskoran:** Berikan jawaban lengkap untuk pilihan ganda serta rubrik penilaian jawaban uraian secara detail.
=== END_BLOCK ===

=== START_BLOCK: Lampiran 4 - Pengayaan dan Remedial [Lampiran] ===
*   **Kegiatan Pengayaan:** (Aktivitas menantang/studi literatur tambahan bagi murid yang melampaui KKTP)
*   **Kegiatan Remedial:** (Aktivitas bimbingan khusus/penyederhanaan materi bagi murid yang belum mencapai KKTP)
=== END_BLOCK ===

=== START_BLOCK: Lampiran 5 - Bahan Bacaan & Media Pembelajaran [Lampiran] ===
*   **Bahan Bacaan Murid:** (Ringkasan materi pelajaran yang padat, akurat, dan mudah dipahami murid)
*   **Bahan Bacaan Guru:** (Informasi latar belakang materi yang lebih mendalam, termasuk antisipasi miskonsepsi)
*   **Media Pembelajaran:** (Tautan referensi video YouTube valid, tautan Canva/Wordwall, atau game kuis digital Quizizz/Kahoot)
=== END_BLOCK ===

=== START_BLOCK: Lampiran 6 - Glosarium & Daftar Pustaka [Lampiran] ===
*   **Glosarium:** (Minimal 3 kosakata/istilah ilmiah penting beserta definisinya)
*   **Daftar Pustaka:** (Minimal 2 referensi buku atau dokumen kurikulum resmi Kemendikdasmen dengan format penulisan standar APA/reguler)
=== END_BLOCK ===

PENTING: Tulis seluruh modul secara tuntas sampai Blok Lampiran terakhir. Jangan memotong penjelasan atau memberikan placeholder "(diisi guru)" atau "(sesuaikan dengan materi)". Isi secara penuh dan operasional!
`;
};