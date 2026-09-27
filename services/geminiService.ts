import { GoogleGenAI } from '@google/genai';

// Retrieve Gemini API Key from localStorage or environment variables
export const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('GEMINI_API_KEY');
    if (localKey) return localKey;
  }
  
  // Try Vite or process env
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || 
         (import.meta as any).env?.GEMINI_API_KEY || 
         (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || 
         '';
};

// Main generator for full Modul Ajar
export const generateModulAjar = async (
  prompt: string,
  uploadedImage?: { mimeType: string; data: string } | null
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key Gemini tidak ditemukan. Harap masukkan API Key di pengaturan terlebih dahulu.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents: any[] = [];

  if (uploadedImage) {
    contents.push({
      inlineData: {
        mimeType: uploadedImage.mimeType,
        data: uploadedImage.data,
      },
    });
  }

  contents.push(prompt);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
  });

  return response.text || '';
};

// Copilot generator for individual blocks/modules
export const generatePartialBlock = async (
  generatorType: string,
  category: string,
  formData: any,
  addInstructions: string,
  blocksContentStr?: string,
  uploadedImage?: { mimeType: string; data: string } | null
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key Gemini tidak ditemukan.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents: any[] = [];

  if (uploadedImage) {
    contents.push({
      inlineData: {
        mimeType: uploadedImage.mimeType,
        data: uploadedImage.data,
      },
    });
  }

  const systemContext = `Anda adalah asisten kurikulum ahli Kurikulum Merdeka. 
Hasilkan bagian modul ajar spesifik untuk bagian "${generatorType}" dengan kategori "${category}".

Informasi Konteks Saat Ini:
- Mata Pelajaran: ${formData.mapel || '-'}
- Fase / Kelas: ${formData.fase || '-'} / ${formData.kelas || '-'}
- Elemen: ${formData.elemen || '-'}
- Alokasi Waktu: ${formData.alokasiWaktu || '-'}
- Topik / Bab: ${formData.topik || '-'}

${blocksContentStr ? `Blok Modul Ajar yang sudah ada:\n${blocksContentStr}\n` : ''}

Instruksi Khusus Pembuatan:
${addInstructions}

Format output: Berikan langsung kontennya dalam format Markdown tanpa teks pengantar atau penutup. Gunakan heading Markdown yang sesuai.`;

  contents.push(systemContext);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
  });

  return response.text || '';
};

// AI Auditor/Assessor for quality check
export const analyzeModulAjar = async (
  currentBlocks: any[],
  mapel: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key Gemini tidak ditemukan.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const blocksText = currentBlocks
    .map((b) => `### ${b.title} (${b.category})\n${b.content}`)
    .join('\n\n');

  const prompt = `Anda adalah auditor profesional kualitas dokumen Modul Ajar Kurikulum Merdeka.
Evaluasilah dokumen Modul Ajar untuk mata pelajaran "${mapel}" di bawah ini:

---
${blocksText}
---

Berikan analisis komprehensif Anda. Output harus HANYA berupa blok kode JSON yang valid dengan format persis seperti di bawah ini, tanpa teks pengantar, penutup, atau tanda markdown tambahan lainnya di luar format JSON:

\`\`\`json
{
  "score": 85,
  "checklist": {
    "cp": true,
    "tp": true,
    "kktp": true,
    "asesmenAwal": true,
    "formatif": true,
    "sumatif": true,
    "lkpd": true,
    "rubrik": true,
    "daftarPustaka": true
  },
  "scores": {
    "administrasi": 85,
    "regulasi": 90,
    "pembelajaran": 85,
    "asesmen": 80,
    "bahasa": 90,
    "desain": 85
  },
  "feedback": {
    "kelebihan": [
      "Struktur modul rapi dan sesuai dengan format standar administrasi.",
      "Tujuan pembelajaran selaras dengan elemen Capaian Pembelajaran."
    ],
    "kekurangan": [
      "Asesmen diagnostik non-kognitif awal belum digambarkan dengan detil.",
      "Rubrik kriteria ketercapaian tujuan pembelajaran kurang spesifik."
    ],
    "saran": [
      "Tambahkan contoh instrumen asesmen diagnostik di bagian awal.",
      "Perjelas rubrik deskripsi kualitatif untuk penilaian tugas LKPD."
    ]
  }
}
\`\`\``;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || '';
};
