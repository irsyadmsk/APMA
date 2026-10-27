/** Local lesson drafts. No model, network, inferred curriculum or invented sources.
 * Author: Muhammad Irsyad Sirojul Khoeir.
 */
export type LessonForm = {
  namaGuru?: string; institusi?: string; tahun?: string; jenjang?: string;
  kelas?: string; fase?: string; semester?: string; mapel?: string; elemen?: string;
  cp?: string; materi?: string; topik?: string; alokasi?: string; lamaWaktu?: string;
  jumlahPertemuan?: number; sumberBelajar?: string; kesiapanBelajar?: string;
  karakteristikMurid?: string; model?: string; media?: string; uploadedText?: string | null;
};
const clean = (value: unknown, fallback = '[Perlu dilengkapi guru]') =>
  String(value ?? '').trim().replace(/===/g, '').slice(0, 12000) || fallback;
const section = (title: string, category: string, body: string) =>
  `=== START_BLOCK: ${title} [${category}] ===\n${body}\n=== END_BLOCK ===`;
export function lessonMinutes(input: string): number {
  const text = input.trim().toLowerCase();
  const product = text.match(/^(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:menit|minutes?|mins?)?$/);
  const plain = text.match(/^(\d+(?:\.\d+)?)\s*(?:menit|minutes?|mins?)?$/);
  const value = product ? Number(product[1]) * Number(product[2]) : plain ? Number(plain[1]) : NaN;
  return Number.isFinite(value) && value > 0 && value <= 1440 ? Math.round(value) : 0;
}
export function lessonDraft(form: LessonForm): string {
  const topic = clean(form.materi || form.topik), subject = clean(form.mapel);
  const count = Math.min(24, Math.max(1, Math.trunc(Number(form.jumlahPertemuan) || 1)));
  const blocks = [
    section('Identitas dan catatan draf', 'Informasi Umum',
      `Draf template lokal — tinjau tujuan, kegiatan dan asesmen sebelum digunakan. Bukan hasil AI atau validasi kurikulum.\n\n`+
      `- Guru: ${clean(form.namaGuru)}\n- Sekolah: ${clean(form.institusi)}\n- Tahun: ${clean(form.tahun)}\n- Jenjang: ${clean(form.jenjang)}\n- Kelas / fase: ${clean(form.kelas)} / ${clean(form.fase)}\n- Mata pelajaran: ${subject}\n- Materi: ${topic}\n- Pertemuan: ${count}\n- Alokasi waktu: ${form.lamaWaktu && lessonMinutes(form.lamaWaktu) ? `${count} pertemuan (total ${count * lessonMinutes(form.lamaWaktu)} menit)` : clean(form.lamaWaktu || form.alokasi)}`),
    section('Capaian dan tujuan pembelajaran', 'Komponen Inti',
      `**CP dari guru:** ${clean(form.cp, '[Masukkan CP dari dokumen kurikulum yang berlaku; tidak ditentukan otomatis.]')}\n\n`+
      `**Usulan tujuan — sesuaikan dengan CP:**\n1. Murid menjelaskan gagasan utama ${topic} menggunakan contoh yang relevan.\n2. Murid membandingkan dua contoh dan menjelaskan alasan perbedaannya.\n3. Murid menyajikan hasil kerja dengan bukti serta refleksi.\n\n`+
      `**Usulan KKTP:** penjelasan tepat; contoh relevan; alasan didukung bukti. Guru menentukan indikator, tingkat kesulitan dan ambang ketercapaian.`),
    section('Kesiapan dan strategi', 'Komponen Inti',
      `- Kesiapan belajar: ${clean(form.kesiapanBelajar)}\n- Karakteristik murid: ${clean(form.karakteristikMurid)}\n- Model pilihan guru: ${clean(form.model)}\n- Media: ${clean(form.media)}\n\n`+
      `Awali dengan pertanyaan pengalaman murid tentang ${topic}. Beri contoh konkret atau dukungan membaca sesuai kebutuhan; berikan tugas perluasan untuk murid yang siap.`),
    section('Rencana asesmen', 'Komponen Inti',
      `**Awal:** minta murid menuliskan apa yang sudah diketahui dan satu pertanyaan tentang ${topic}.\n\n**Formatif:** amati penjelasan, bukti dan partisipasi saat diskusi; berikan umpan balik pada langkah berikutnya.\n\n**Sumatif:** kumpulkan hasil kerja dan penjelasan individu. Cocokkan dengan tujuan serta KKTP yang telah ditinjau guru.`),
  ];
  for (let meeting = 1; meeting <= count; meeting++) blocks.push(section(`Kegiatan pertemuan ${meeting}`, 'Komponen Inti',
    `**Pendahuluan:** hubungkan ${topic} dengan pengalaman murid, sampaikan tujuan, dan cek kesiapan.\n\n`+
    `**Inti:** amati contoh yang disiapkan guru; diskusikan pertanyaan LKPD; bandingkan hasil; jelaskan alasan dengan bukti. Guru menyesuaikan aktivitas dan waktu tiap pertemuan.\n\n`+
    `**Penutup:** murid menuliskan satu pemahaman baru dan satu hal yang perlu dipelajari lagi. Gunakan respons untuk menentukan tindak lanjut.`));
  blocks.push(section('LKPD', 'Lampiran', lessonBlock('LKPD', form)),
    section('Rubrik penilaian', 'Lampiran', lessonBlock('Rubrik', form)),
    section('Refleksi, remedial dan pengayaan', 'Lampiran',
      'Refleksi murid: apa yang dipahami, bukti apa yang mendukung, dan bagian mana yang masih sulit?\n\nRefleksi guru: siapa membutuhkan dukungan tambahan dan kegiatan mana perlu disesuaikan?\n\nRemedial: ulangi dengan satu contoh dan bimbingan bertahap. Pengayaan: bandingkan contoh baru dan jelaskan keterbatasan kesimpulan.'),
    section('Bahan dan daftar pustaka', 'Lampiran',
      `**Sumber yang diberikan guru:** ${clean(form.sumberBelajar, '[Tambahkan sumber yang benar-benar digunakan dan verifikasi bibliografinya.]')}\n\n`+
      `**Catatan bahan unggahan:** ${form.uploadedText ? clean(form.uploadedText) : 'Belum ada teks bahan. Gambar tidak dianalisis oleh generator lokal.'}`));
  return blocks.join('\n\n');
}
export function lessonBlock(kind: string, form: LessonForm, instructions = ''): string {
  const topic = clean(form.materi || form.topik);
  const note = instructions.trim() ? `\n\n**Catatan guru:** ${clean(instructions)}` : '';
  if (/rubrik/i.test(kind)) return '| Kriteria | Perlu bimbingan | Mulai berkembang | Mandiri |\n|---|---|---|---|\n| Pemahaman | Perlu contoh dan arahan | Menjelaskan sebagian gagasan | Menjelaskan dengan contoh tepat |\n| Bukti | Belum menyertakan bukti | Bukti belum konsisten | Bukti relevan dan dijelaskan |\n| Komunikasi | Perlu bantuan menyusun jawaban | Jawaban dapat diikuti | Jawaban runtut dan jelas |\n\nGuru menyesuaikan deskriptor dan aturan penskoran dengan tujuan pembelajaran.' + note;
  if (/lkpd|soal|asesmen/i.test(kind)) return `### ${clean(kind)} — ${topic}\n\n1. Amati contoh ${topic} yang diberikan guru. Catat hal yang Anda temukan.\n2. Bandingkan dengan contoh kedua: apa persamaan dan perbedaannya?\n3. Jelaskan kesimpulan Anda dan bukti yang mendukungnya.\n4. Tulis pertanyaan yang belum terjawab.\n\n**Untuk guru:** tambahkan stimulus dan kunci berdasarkan bahan yang benar-benar diajarkan; soal ini belum merupakan instrumen tervalidasi.` + note;
  return `### ${clean(kind)}\n\nTopik: ${topic}\n\n- Tujuan bagian: [Tentukan berdasarkan CP dan kebutuhan murid.]\n- Kegiatan: gunakan contoh, diskusi dan hasil kerja yang terkait topik.\n- Bukti ketercapaian: [Tentukan indikator yang dapat diamati.]\n- Tindak lanjut: tinjau respons murid dan sesuaikan dukungan.\n\nDraf lokal yang perlu dilengkapi guru.` + note;
}
export function inspectLesson(blocks: {title?: string; content?: string}[]) {
  const text = blocks.map(block => `${block.title || ''}\n${block.content || ''}`).join('\n');
  const rules = { cp: /CP|capaian/i, tp: /tujuan pembelajaran/i, kktp: /KKTP/i, asesmenAwal: /asesmen.*awal|\*\*Awal/i, formatif: /formatif/i, sumatif: /sumatif/i, lkpd: /LKPD/i, rubrik: /rubrik/i, daftarPustaka: /daftar pustaka/i };
  const checklist = Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, rule.test(text)]));
  const score = Math.round(Object.values(checklist).filter(Boolean).length / Object.keys(rules).length * 100);
  const placeholders = (text.match(/\[[^\]\n]+\]/g) || []).length;
  return { score, checklist, scores: { administrasi: score, regulasi: 0, pembelajaran: 0, asesmen: 0, bahasa: 0, desain: 0 },
    feedback: { kelebihan: ['Pemeriksaan struktur dilakukan lokal tanpa API.'], kekurangan: [`${placeholders} catatan isian masih perlu ditinjau.`, 'Skor hanya kelengkapan struktur; ketepatan CP, isi, regulasi dan asesmen belum divalidasi.'], saran: ['Tinjau setiap bagian bersama guru sebelum menggunakan atau menerbitkan dokumen.'] } };
}
