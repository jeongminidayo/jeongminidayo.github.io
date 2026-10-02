// 세컨브레인 노트 한 장을 읽고 쓰는 도우미. 관리자 화면(src/pages/admin.astro)이 쓴다.
// 맨 위 정보칸은 `키: 값` 한 줄짜리만 고치고, 그 밖의 줄(여러 줄짜리 목록 등)은 손대지 않고 그대로 둔다.

export function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: [], body: text };
  const fm = [];
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (kv) {
      let v = kv[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      fm.push([kv[1].trim(), v]);
    } else if (line.trim()) {
      fm.push([null, line]);
    }
  }
  return { fm, body: m[2] };
}

export const getFm = (note, key) => (note.fm.find((r) => r[0] === key) || [])[1] || '';

export function setFm(note, key, value) {
  const row = note.fm.find((r) => r[0] === key);
  if (value === '' || value == null) note.fm = note.fm.filter((r) => r[0] !== key);
  else if (row) row[1] = String(value);
  else note.fm.push([key, String(value)]);
}

// 값에 `: `나 따옴표처럼 정보칸을 깨뜨릴 글자가 있으면 따옴표로 감싼다.
const quote = (v) => {
  if (/^\[.*\]$/.test(v) || v === 'true' || v === 'false') return v;
  if (/[:#]\s|:$|^[\s"'@&*!|>%{[`-]|\s$/.test(v)) return v.includes('"') ? (v.includes("'") ? v : `'${v}'`) : `"${v}"`;
  return v;
};

export const serialize = (note) =>
  '---\n' +
  note.fm.map(([k, v]) => (k === null ? v : `${k}: ${quote(v)}`)).join('\n') +
  '\n---\n\n' +
  note.body.replace(/^\s+/, '').replace(/\s*$/, '\n');

// 강의 노트 본문에서 표를 찾아 앞글 · 줄 · 뒷글로 나눈다.
export function splitLectureTable(body) {
  const lines = body.split(/\r?\n/);
  const isRow = (l) => l.trim().startsWith('|');
  const first = lines.findIndex(isRow);
  if (first < 0) return { before: lines, rows: [], after: [] };
  let last = first;
  while (last + 1 < lines.length && isRow(lines[last + 1])) last++;
  const rows = lines
    .slice(first, last + 1)
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c[0] || ''))
    .map((c) => ({ date: c[0], org: c[1] || '', topic: c[2] || '', role: c[3] || '' }));
  return { before: lines.slice(0, first), rows, after: lines.slice(last + 1) };
}

export const joinLectureTable = (before, rows, after) =>
  [
    ...before,
    '| 날짜 | 기관 | 주제 | 역할 |',
    '|---|---|---|---|',
    ...[...rows]
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((r) => `| ${[r.date, r.org, r.topic, r.role].map((c) => String(c).replace(/\|/g, '/')).join(' | ')} |`),
    ...after,
  ].join('\n');
