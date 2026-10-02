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

type LectureRow = { date: string; org: string; topic: string; role: string };
export type Lecture = { from: string; to: string; org: string; topic: string; role: string; days: number };

// 같은 기관에서 이어진 날짜는 한 줄로 묶는다(이틀 연속 강의 → "09.08 ~ 09.09").
export function getLectures(): { rows: Lecture[]; total: number } {
  const raw: LectureRow[] = read('lectures.json');
  const asc = [...raw].sort((a, b) => (a.date < b.date ? -1 : 1));
  const rows: Lecture[] = [];
  for (const r of asc) {
    const last = rows[rows.length - 1];
    const gap = last ? (Date.parse(r.date) - Date.parse(last.to)) / 86400000 : Infinity;
    if (last && last.org === r.org && last.topic === r.topic && gap <= 1) {
      last.to = r.date;
      last.days++;
    } else {
      rows.push({ from: r.date, to: r.date, org: r.org, topic: r.topic, role: r.role, days: 1 });
    }
  }
  return { rows: rows.reverse(), total: raw.length };
}

export const lectureDate = (l: Lecture) => (l.from === l.to ? fmt(l.from) : `${fmt(l.from)} ~ ${fmt(l.to).slice(5)}`);

export async function getListed(name: 'files' | 'works') {
  // 비어 있는 묶음을 부르면 경고가 뜨므로 파일이 있을 때만 읽는다.
  if (!hasNotes(name)) return [];
  const items = await getCollection(name);
  return items.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
