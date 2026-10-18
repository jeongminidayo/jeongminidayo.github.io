import fs from 'node:fs';
import path from 'node:path';
import { getCollection } from 'astro:content';

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', name), 'utf8'));

export const fmt = (d: Date | string) => {
  const iso = typeof d === 'string' ? d : d.toISOString().slice(0, 10);
  return iso.replaceAll('-', '.');
};

const hasNotes = (dir: string) => {
  const full = path.join(process.cwd(), 'content', dir);
  return fs.existsSync(full) && fs.readdirSync(full).some((f) => f.endsWith('.md'));
};

export async function getPosts() {
  if (!hasNotes('posts')) return [];
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}


export type Contact = { label: string; value: string; href: string; copy: boolean };
export type About = {
  name: string;
  tagline: string;
  photo: string;
  rows: { label: string; value: string }[];
  body: string;
  contacts: Contact[];
};
export const getAbout = (): About => read('about.json');

// 검색 결과·공유 미리보기·RSS에 쓰는 한 줄 설명. 프로필 글이 있으면 그 글, 없으면 이름 아래 한 줄과 표 줄로 만든다.
export function siteDescription(about: About) {
  const text = about.body.replace(/\s+/g, ' ').trim();
  if (text) return text;
  return [about.tagline, ...about.rows.map((r) => `${r.label} ${r.value}`)].filter(Boolean).join(' · ');
}

type LectureRow = { date: string; org: string; topic: string; role: string; place?: string };
export type Lecture = {
  from: string; to: string; org: string; topic: string; role: string; place: string; days: number;
  /** 이 강의 후기 글. 있으면 강의 창에서 기관 이름을 누르면 그 글로 간다. */
  post?: { slug: string; title: string };
};

// 대표님 사이트(paperlogy.blog/lectures)처럼 강의한 날마다 한 줄씩 둔다 — 이어진 날도 묶지 않는다(2026-10-18 정민).
export function getLectures(): { rows: Lecture[]; total: number } {
  const raw: LectureRow[] = read('lectures.json');
  const rows: Lecture[] = [...raw]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => ({ from: r.date, to: r.date, org: r.org, topic: r.topic, role: r.role, place: r.place || '', days: 1 }));
  return { rows, total: raw.length };
}

// 강의 후기 글 찾기 — 글 제목에 기관 이름과 강의 낱말(강의·튜터·출강·특강·수업·교육)이 같이 들어 있으면 그 강의 줄에 잇는다.
// 블로그에 글만 쓰면 되게 하려는 것이다. 신세계 백화점 쇼핑 후기처럼 기관 이름만 겹치는 글은 강의 낱말이 없어서 안 걸린다.
// 노트 정보칸에 `강의: 기관 이름`을 적으면 제목과 상관없이 그 기관에 잇는다.
const LECTURE_WORD = /강의|튜터|출강|특강|수업|교육/;
const squash = (t: string) => t.replace(/\s+/g, '').toLowerCase();
// 제목에 기관 이름을 줄여 쓸 때를 받아 준다: 띄어쓰기 무시, "그룹"·"주식회사" 뺀 이름, 첫 낱말, "대학교" → "대".
function orgKeys(org: string) {
  const keys = new Set<string>();
  const add = (k: string) => { const q = squash(k); if (q.length >= 2) keys.add(q); };
  add(org);
  add(org.replace(/그룹|주식회사|\(주\)/g, ''));
  add(org.split(/\s+/)[0]);
  for (const k of [...keys]) if (k.includes('대학교')) keys.add(k.replace('대학교', '대'));
  return [...keys];
}

export function linkLecturePosts(rows: Lecture[], posts: { data: { title: string; slug: string; date: Date; lecture?: string } }[]) {
  const keyed = rows.map((r) => ({ r, keys: orgKeys(r.org) }));
  // 오래된 글부터 보며, 아직 후기가 안 붙은 강의 중 글 날짜 직전(하루 뒤까지 허용)에 끝난 가장 최근 줄에 붙인다.
  const asc = [...posts].sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf());
  for (const p of asc) {
    const manual = p.data.lecture ? squash(p.data.lecture) : '';
    if (!manual && !LECTURE_WORD.test(p.data.title)) continue;
    const hay = manual || squash(p.data.title);
    // 가장 길게 맞는 기관이 이긴다("카카오 NGO AI TECH" 후기가 "카카오" 줄에 붙지 않게).
    let best = 0;
    for (const k of keyed) for (const key of k.keys) if (hay.includes(key)) best = Math.max(best, key.length);
    if (!best) continue;
    const cands = keyed.filter((k) => k.keys.some((key) => key.length === best && hay.includes(key)));
    const postDay = p.data.date.toISOString().slice(0, 10);
    const limit = new Date(Date.parse(postDay) + 86400000).toISOString().slice(0, 10);
    const target = cands
      .map((k) => k.r)
      .filter((r) => !r.post && r.from <= limit)
      .sort((a, b) => (a.to < b.to ? 1 : -1))[0];
    if (target) target.post = { slug: p.data.slug, title: p.data.title };
  }
  return rows;
}

export async function getLecturesLinked() {
  const lectures = getLectures();
  linkLecturePosts(lectures.rows, await getPosts());
  return lectures;
}

// 강의 창을 연도별로 나눈다(최근 연도가 위).
export const lecturesByYear = (rows: Lecture[]) => {
  const years: { year: string; rows: Lecture[] }[] = [];
  for (const l of rows) {
    const y = l.from.slice(0, 4);
    if (years.at(-1)?.year !== y) years.push({ year: y, rows: [] });
    years.at(-1)!.rows.push(l);
  }
  return years;
};

export async function getListed(name: 'files' | 'works') {
  // 비어 있는 묶음을 부르면 경고가 뜨므로 파일이 있을 때만 읽는다.
  if (!hasNotes(name)) return [];
  const items = await getCollection(name);
  return items.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
