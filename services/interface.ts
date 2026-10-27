import {useSyncExternalStore} from 'react';
export type InterfaceLanguage='en'|'id'|'ar';
const key='irsyads-language';
const valid=(value:unknown):value is InterfaceLanguage=>['en','id','ar'].includes(String(value));
function read():InterfaceLanguage {
 if(typeof window==='undefined')return 'en';
 const explicit=new URLSearchParams(location.search).get('lang');
 if(valid(explicit))return explicit;
 try {const cookie=document.cookie.split(/;\s*/).find(item=>item.startsWith(key+'='))?.slice(key.length+1);if(valid(cookie))return cookie;const saved=localStorage.getItem(key);if(valid(saved))return saved;}catch{}
 return 'en';
}
function subscribe(update:()=>void){window.addEventListener('irsyads-language-change',update);window.addEventListener('storage',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('irsyads-language-change',update);window.removeEventListener('storage',update);window.removeEventListener('popstate',update);};}
export function chooseLanguage(language:InterfaceLanguage){
 const url=new URL(location.href);if(language==='en')url.searchParams.delete('lang');else url.searchParams.set('lang',language);history.replaceState(null,'',url);
 try {localStorage.setItem(key,language);const shared=location.hostname==='irsyads.com'||location.hostname.endsWith('.irsyads.com');document.cookie=`${key}=${language}; Path=/; Max-Age=31536000; SameSite=Lax${shared?'; Domain=irsyads.com; Secure':''}`;}catch{}
 window.dispatchEvent(new CustomEvent('irsyads-language-change',{detail:language}));
}
const additional={
  "Ganjil": [
    "First semester",
    "الفصل الأول"
  ],
  "Genap": [
    "Second semester",
    "الفصل الثاني"
  ],
  "Contoh: Muhammad Irsyad Sirojul Khoeir, M.Sos.": [
    "Example: Muhammad Irsyad Sirojul Khoeir, M.Sos.",
    "مثال: Muhammad Irsyad Sirojul Khoeir, M.Sos."
  ],
  "Contoh: MA Insan Cendekia Nusantara": [
    "Example: MA Insan Cendekia Nusantara",
    "مثال: MA Insan Cendekia Nusantara"
  ],
  "Contoh: VII atau 10": [
    "Example: VII or 10",
    "مثال: VII أو 10"
  ],
  "Contoh: PAI / Bahasa Arab / IPA": [
    "Example: Islamic Education / Arabic / Science",
    "مثال: التربية الإسلامية / العربية / العلوم"
  ],
  "Contoh: Al-Qur’an dan Hadis / Pengukuran Aljabar": [
    "Example: Qur’an and Hadith / Algebra",
    "مثال: القرآن والحديث / الجبر"
  ],
  "Contoh: Al-Qur'an dan Hadis / Pengukuran Aljabar": [
    "Example: Qur’an and Hadith / Algebra",
    "مثال: القرآن والحديث / الجبر"
  ],
  "Tempel deskripsi Capaian Pembelajaran (CP) dari regulasi BSKAP terbaru di sini untuk keselarasan modul yang tinggi.": [
    "Paste the official learning outcomes you intend to use. Verify the source and applicability before teaching.",
    "ألصق نواتج التعلم الرسمية التي ستستخدمها. تحقق من المصدر وملاءمته قبل التدريس."
  ],
  "Contoh: Struktur Sel Hewan dan Tumbuhan": [
    "Example: Animal and plant cell structure",
    "مثال: تركيب الخلايا الحيوانية والنباتية"
  ],
  "Contoh: 2 x 40 menit": [
    "Example: 2 x 40 minutes",
    "مثال: 2 x 40 دقيقة"
  ],
  "Kurikulum Merdeka (Nasional)": [
    "Merdeka curriculum (national)",
    "منهج Merdeka (وطني)"
  ],
  "Kurikulum Berbasis Cinta (Kemenag)": [
    "Kurikulum Berbasis Cinta (Ministry of Religious Affairs)",
    "Kurikulum Berbasis Cinta (وزارة الشؤون الدينية)"
  ],
  "Kurikulum Khas Sekolah/Lokal": [
    "School or local curriculum",
    "منهج المدرسة أو المنهج المحلي"
  ],
  "Kurikulum Standar Yayasan": [
    "Foundation curriculum",
    "منهج المؤسسة"
  ]
} as Record<string,[string,string]>;
// Interface resources only. Teacher inputs and generated teaching materials are untouched.
export const messages:Record<string,[string,string]>={
 'Nama Guru Penyusun':['Teacher name','اسم المعلم'],
 'Nama Institusi/Sekolah':['School or institution','المدرسة أو المؤسسة'],
 'Tahun Ajaran':['Academic year','العام الدراسي'],
 'Semester':['Semester','الفصل الدراسي'],
 'Landasan Regulasi Kurikulum':['Curriculum framework','إطار المنهج'],
 'Nama Kurikulum Khusus':['Custom curriculum name','اسم المنهج المخصص'],
 'Jenjang Pendidikan':['Education level','المرحلة التعليمية'],
 'Fase':['Curriculum phase','مرحلة المنهج'],
 'Kelas':['Grade','الصف'],
 'Mata Pelajaran':['Subject','المادة'],
 'Elemen Mapel (Opsional)':['Subject strand (optional)','مجال المادة (اختياري)'],
 'Deskripsi Capaian Pembelajaran (CP) Resmi':['Official learning outcomes (CP)','نواتج التعلم الرسمية (CP)'],
 'Materi Pokok / Judul Pembelajaran':['Topic or lesson title','الموضوع أو عنوان الدرس'],
 'Jumlah Sesi Pertemuan':['Number of sessions','عدد الجلسات'],
 'Durasi per Pertemuan':['Duration per session','مدة الجلسة'],
 'Model Pembelajaran':['Teaching model','نموذج التدريس'],
 'Pendekatan Pembelajaran':['Teaching approach','نهج التدريس'],
 'Karakteristik Murid (Gaya Belajar/Jumlah)':['Learner characteristics','خصائص المتعلمين'],
 'Kesiapan Belajar Murid (Prasyarat)':['Prior knowledge and readiness','المعرفة السابقة والاستعداد'],
 'Sarana & Prasarana':['Facilities and resources','المرافق والموارد'],
 'Metode Pembelajaran':['Teaching methods','طرق التدريس'],
 'Media Pembelajaran':['Teaching materials and media','المواد والوسائط التعليمية'],
 'Sumber Belajar':['References and sources','المراجع والمصادر'],
 'Topik Panca Cinta (Pilih minimal 1)':['Panca Cinta topics (choose at least one)','موضوعات Panca Cinta (اختر واحدًا على الأقل)'],
 'Materi Insersi Ajaran Cinta (Pilih minimal 1)':['Integrated topics (choose at least one)','الموضوعات المدمجة (اختر واحدًا على الأقل)'],
 'Dimensi Profil Lulusan (Sesuai SKL Standar Terbaru)':['Graduate profile dimensions','أبعاد ملف الخريج'],
 'Harap pilih minimal 1 Dimensi':['Choose at least one dimension','اختر بُعدًا واحدًا على الأقل'],
 'Harap isi kolom ini':['Complete this field','أكمل هذا الحقل'],
 'Langkah 1: Identitas & Informasi Dasar':['Step 1: Teacher and class details','الخطوة ١: بيانات المعلم والصف'],
 'Informasi Pendidik & Institusi':['Teacher and institution','المعلم والمؤسسة'],
 'Landasan Kurikulum & Kelas':['Curriculum and class','المنهج والصف'],
 'Capaian & Elemen Kurikulum':['Learning outcomes and strands','نواتج التعلم والمجالات'],
 'Langkah 2: Detail Pembelajaran & Aspek Diferensiasi':['Step 2: Lesson plan and learner needs','الخطوة ٢: خطة الدرس واحتياجات المتعلمين'],
 'Alokasi & Model':['Timing and teaching model','التوقيت ونموذج التدريس'],
 'Karakteristik & Kesiapan Belajar Murid':['Learner needs and readiness','احتياجات المتعلمين واستعدادهم'],
 'Metode, Media & Sumber Belajar':['Methods, materials and references','الطرق والمواد والمراجع'],
 'Profil Pelajar/Lulusan':['Learner and graduate profile','ملف المتعلم والخريج'],
 'Pilih Regulasi Kurikulum':['Choose a curriculum framework','اختر إطار المنهج'],
 'Pilih Jenjang':['Choose an education level','اختر المرحلة التعليمية'],
 'Pilih Fase':['Choose a phase','اختر المرحلة'],
 'Pilih Model':['Choose a teaching model','اختر نموذج التدريس'],
 'Sesi Pertemuan':['sessions','جلسات'],
 'Panduan':['Guide','الدليل'],
 'Mulai Baru':['New document','مستند جديد'],
 'Identitas Dasar':['Class details','بيانات الصف'],
 'Detail Pembelajaran':['Lesson plan','خطة الدرس'],
 'Workspace Editor':['Document editor','محرر المستند'],
 'Kembali':['Back','رجوع'],
 'Selanjutnya':['Next','التالي'],
 'Create local draft':['Create local draft','إنشاء مسودة محلية'],
 'Aktifkan Mode Terang':['Use light theme','استخدام المظهر الفاتح'],
 'Aktifkan Mode Gelap':['Use dark theme','استخدام المظهر الداكن'],
 'Daftar Blok Modul':['Document sections','أقسام المستند'],
 '+ Tambah Blok':['+ Add section','+ إضافة قسم'],
 'Pindahkan Ke Atas':['Move up','نقل لأعلى'],
 'Pindahkan Ke Bawah':['Move down','نقل لأسفل'],
 'Hapus Blok':['Delete section','حذف القسم'],
 'Struktur':['Outline','المخطط'],
 'Copilot':['Templates','القوالب'],
 'Audit':['Structure check','فحص البنية'],
 'Desain':['Design','التصميم'],
 'Profil':['School profile','ملف المدرسة'],
 'Local section templates':['Local section templates','قوالب الأقسام المحلية'],
 'Local structure check':['Local structure check','فحص البنية محليًا'],
 'Structural completeness':['Structural completeness','اكتمال البنية'],
 'Checklist Kelengkapan Modul':['Section checklist','قائمة الأقسام'],
 'Temuan & Nomenklatur':['Items to review','عناصر للمراجعة'],
 'Rekomendasi Perbaikan':['Suggested improvements','التحسينات المقترحة'],
 'Desain & Kustomisasi':['Document design','تصميم المستند'],
 'Profil Sekolah & Riwayat Versi':['School profile and version history','ملف المدرسة وسجل الإصدارات'],
 'Pratinjau Modul Aktif':['Document preview','معاينة المستند'],
 'Klik ganda untuk mengedit langsung':['Double-click to edit','انقر مرتين للتحرير'],
 '✏️ Klik untuk Mengedit':['✏️ Click to edit','✏️ انقر للتحرير'],
 '🖨️ Cetak / PDF':['🖨️ Print / PDF','🖨️ طباعة / PDF'],
 '💾 Word (.docx)':['💾 Word (.docx)','💾 Word (.docx)'],
 'Coba Lagi':['Try again','حاول مجددًا'],
 'Batal':['Cancel','إلغاء'],
 'Simpan Perubahan':['Save changes','حفظ التغييرات'],
 'Tutup':['Close','إغلاق'],
 'Mengerti':['Got it','فهمت'],
 'Build editable lesson drafts with local templates':['Build editable lesson drafts with local templates','إنشاء مسودات دروس قابلة للتحرير باستخدام قوالب محلية'],
 'Local templates · no API key or cloud AI. Review curriculum, goals and assessment before use. Images are not analysed.':['Local templates · no API key or cloud AI. Review curriculum, goals and assessment before use. Images are not analysed.','قوالب محلية دون مفتاح API أو ذكاء اصطناعي سحابي. راجع المنهج والأهداف والتقييم قبل الاستخدام. لا يتم تحليل الصور.'],
};
Object.assign(messages,additional);
export function useLessonInterface(){const language=useSyncExternalStore(subscribe,read,()=> 'en' as InterfaceLanguage);return {language,ui:(text:string)=>language==='id'?text:messages[text]?.[language==='en'?0:1]??text};}
