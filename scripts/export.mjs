// 세컨브레인 `6_발행/` 폴더에서 `공개: true`인 것만 골라 사이트 저장소로 옮긴다.
// 쓰는 법: node scripts/export.mjs <6_발행 폴더> <사이트 저장소 폴더>
// 세컨브레인 쪽 깃허브 액션과 맥(`npm run sync`)이 같은 스크립트를 쓴다. 외부 패키지 없이 돈다.
import fs from 'node:fs';
import path from 'node:path';

const [srcArg, siteArg] = process.argv.slice(2);
if (!srcArg || !siteArg) {
  console.error('쓰는 법: node scripts/export.mjs <6_발행 폴더> <사이트 저장소 폴더>');
  process.exit(1);
}
const SRC = path.resolve(srcArg);
const SITE = path.resolve(siteArg);
const OUT = path.join(SITE, 'content');
const OUT_ATTACH = path.join(SITE, 'public', 'attachments');
const ATTACH_SRC = path.join(SRC, '첨부');

if (!fs.existsSync(SRC)) {
  console.error(`원본 폴더가 없다: ${SRC}`);
  process.exit(1);
}

// ── 맨 위 정보칸(frontmatter) 읽기: `키: 값` 한 줄짜리만 다룬다 ──
export function parseNote(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[kv[1].trim()] = value;
  }
  return { data, body: m[2] };
}

const isPublic = (data) => String(data['공개']).toLowerCase() === 'true';

export function slugOf(data, file) {
  const raw = data['주소'] || path.basename(file, '.md');
  return raw.trim().replace(/\s+/g, '-').replace(/[\/\\?#%]/g, '');
}

function dateOf(data, file) {
  const d = String(data['날짜'] || '').match(/\d{4}-\d{2}-\d{2}/);
  if (d) return d[0];
  return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

const yaml = (obj) =>
  '---\n' +
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n') +
  '\n---\n';

function listNotes(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => path.join(dir, f));
}

const usedAttachments = new Set();
function useAttachment(name) {
  const clean = path.basename(name.trim());
  if (fs.existsSync(path.join(ATTACH_SRC, clean))) {
    usedAttachments.add(clean);
    return `/attachments/${encodeURIComponent(clean)}`;
  }
  return null;
}

// ── 본문 속 옵시디언 링크 바꾸기 ──
// ![[그림.png]] → 그림, [[공개된 글]] → 그 글로 가는 링크, [[공개 안 된 노트]] → 그냥 글자
function convertBody(body, publicPosts) {
  let out = body.replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, target, alt) => {
    const url = useAttachment(target);
    return url ? `![${alt || ''}](${url})` : '';
  });
  out = out.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_, target, alias) => {
    const hit = publicPosts.get(target.trim());
    const label = (alias || (hit ? hit.title : target)).trim();
    return hit ? `[${label}](/posts/${encodeURI(hit.slug)}/)` : label;
  });
  return out.trim() + '\n';
}

// ── 지우고 새로 쓴다(세컨브레인에서 내린 글이 사이트에서도 내려가게) ──
fs.rmSync(OUT, { recursive: true, force: true });
fs.rmSync(OUT_ATTACH, { recursive: true, force: true });
for (const d of ['posts', 'files', 'works']) {
  fs.mkdirSync(path.join(OUT, d), { recursive: true });
  fs.writeFileSync(path.join(OUT, d, '.gitkeep'), '');
}
fs.mkdirSync(OUT_ATTACH, { recursive: true });

const report = { posts: 0, files: 0, works: 0, lectures: 0, skipped: [] };

// 1) 글 — 먼저 공개 글 목록을 만들어야 글끼리 링크를 걸 수 있다
const postNotes = listNotes(path.join(SRC, '글')).map((file) => ({ file, ...parseNote(fs.readFileSync(file, 'utf8')) }));
const publicPosts = new Map();
for (const n of postNotes) {
  if (!isPublic(n.data)) continue;
  const hit = { slug: slugOf(n.data, n.file), title: n.data['제목'] || path.basename(n.file, '.md') };
  publicPosts.set(path.basename(n.file, '.md'), hit);
  publicPosts.set(hit.title, hit);
}
for (const n of postNotes) {
  if (!isPublic(n.data)) {
    report.skipped.push(path.relative(SRC, n.file));
    continue;
  }
  const slug = slugOf(n.data, n.file);
  const front = yaml({
    title: n.data['제목'] || path.basename(n.file, '.md'),
    date: dateOf(n.data, n.file),
    kind: n.data['분류'] || '',
    summary: n.data['요약'] || '',
    slug,
  });
  fs.writeFileSync(path.join(OUT, 'posts', `${slug}.md`), front + '\n' + convertBody(n.body, publicPosts));
  report.posts++;
}

// 2) 자료, 만든 것 — 목록 한 줄짜리. 파일을 붙였으면 같이 옮긴다
for (const [folder, outDir, key] of [['자료', 'files', 'files'], ['만든것', 'works', 'works']]) {
  for (const file of listNotes(path.join(SRC, folder))) {
    const n = parseNote(fs.readFileSync(file, 'utf8'));
    if (!isPublic(n.data)) {
      report.skipped.push(path.relative(SRC, file));
      continue;
    }
    const slug = slugOf(n.data, file);
    const attached = n.data['파일'] ? useAttachment(n.data['파일']) : null;
    const front = yaml({
      title: n.data['제목'] || path.basename(file, '.md'),
      date: dateOf(n.data, file),
      desc: n.data['설명'] || '',
      link: attached || n.data['링크'] || '',
      slug,
    });
    fs.writeFileSync(path.join(OUT, outDir, `${slug}.md`), front + '\n' + convertBody(n.body, publicPosts));
    report[key]++;
  }
}

// 3) 강의 — 표(날짜 | 기관 | 주제 | 역할)를 읽는다
const lectures = [];
const lectureFile = path.join(SRC, '강의.md');
if (fs.existsSync(lectureFile)) {
  const n = parseNote(fs.readFileSync(lectureFile, 'utf8'));
  if (isPublic(n.data)) {
    for (const line of n.body.split(/\r?\n/)) {
      if (!line.trim().startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length < 2 || /^-+$/.test(cells[0].replace(/[:\s]/g, '')) || cells[0] === '날짜') continue;
      if (!/\d{4}-\d{2}-\d{2}/.test(cells[0])) continue;
      lectures.push({ date: cells[0], org: cells[1], topic: cells[2] || '', role: cells[3] || '' });
    }
  } else {
    report.skipped.push('강의.md');
  }
}
lectures.sort((a, b) => (a.date < b.date ? 1 : -1));
fs.writeFileSync(path.join(OUT, 'lectures.json'), JSON.stringify(lectures, null, 2) + '\n');
report.lectures = lectures.length;

// 4) 프로필 — 프로필 창과 연락 창에 쓰인다. (예전 이름 소개.md도 읽는다)
const about = { name: '이정민', tagline: '', photo: '', rows: [], body: '', contacts: [] };
const aboutFile = ['프로필.md', '소개.md'].map((f) => path.join(SRC, f)).find((f) => fs.existsSync(f));
if (aboutFile) {
  const n = parseNote(fs.readFileSync(aboutFile, 'utf8'));
  if (isPublic(n.data)) {
    about.name = n.data['이름'] || about.name;
    about.tagline = n.data['한줄'] || '';
    about.photo = (n.data['사진'] && useAttachment(n.data['사진'])) || '';

    // 연락 창: 이메일 · 주소 · 유튜브 · 인스타그램 · 블로그 순서. 전화·카카오톡은 적었을 때만 뒤에 붙는다.
    // 유튜브·인스타그램·블로그는 주소를 아직 안 적었으면 "준비 중"으로 뜬다.
    const mail = n.data['이메일'] || n.data['메일'] || n.data['문의'];
    if (mail) about.contacts.push({ label: '이메일', value: mail, href: `mailto:${mail}`, copy: true });
    if (n.data['주소']) about.contacts.push({ label: '주소', value: n.data['주소'], href: '', copy: false });
    const short = (url) => url.replace(/^https?:\/\/(www\.|m\.)?/, '').replace(/\/$/, '');
    for (const key of ['유튜브', '인스타그램', '블로그']) {
      const url = n.data[key];
      about.contacts.push(url ? { label: key, value: short(url), href: url, copy: false } : { label: key, value: '', href: '', copy: false });
    }
    if (n.data['전화']) {
      about.contacts.push({ label: '전화', value: n.data['전화'], href: `tel:${n.data['전화'].replace(/[^0-9+]/g, '')}`, copy: true });
    }
    if (n.data['카카오톡']) about.contacts.push({ label: '카카오톡', value: short(n.data['카카오톡']), href: n.data['카카오톡'], copy: false });

    // 본문: "- 항목: 내용" 꼴의 줄은 프로필 창의 표 한 줄이 되고, 나머지는 글로 들어간다.
    const text = [];
    for (const line of n.body.replace(/^#\s.*$/m, '').split(/\r?\n/)) {
      const row = line.match(/^\s*[-*]\s*([^:：]{1,12})[:：]\s*(.+)$/);
      if (row) about.rows.push({ label: row[1].trim(), value: convertBody(row[2], publicPosts).trim() });
      else text.push(line);
    }
    about.body = convertBody(text.join('\n'), publicPosts).trim();
  } else {
    report.skipped.push(path.basename(aboutFile));
  }
}
fs.writeFileSync(path.join(OUT, 'about.json'), JSON.stringify(about, null, 2) + '\n');

// 5) 실제로 쓰인 첨부만 옮긴다
for (const name of usedAttachments) {
  fs.copyFileSync(path.join(ATTACH_SRC, name), path.join(OUT_ATTACH, name));
}
fs.writeFileSync(path.join(OUT_ATTACH, '.gitkeep'), '');

console.log(
  `옮김: 글 ${report.posts} · 자료 ${report.files} · 만든 것 ${report.works} · 강의 ${report.lectures} · 첨부 ${usedAttachments.size}`,
);
if (report.skipped.length) console.log(`공개 표시가 없어 건너뜀: ${report.skipped.join(', ')}`);
