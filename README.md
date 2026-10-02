# 이정민 홈페이지

https://minglemin01.com — 바탕화면처럼 생긴 개인 사이트. 글, 강의 이력, 자료실, 프로필과 연락처.

## 내용은 여기서 고치지 않는다

`content/`와 `public/attachments/`는 세컨브레인의 `6_발행/` 폴더에서 자동으로 옮겨 온 것이다.
세컨브레인에서 `공개: true`를 붙인 노트만 넘어온다. 글을 쓰거나 고칠 때는 세컨브레인에서 한다.

```
세컨브레인 6_발행/ 에 적고 올린다
  → 세컨브레인 저장소의 액션이 scripts/export.mjs로 공개분만 이 저장소 content/에 넣는다
  → 이 저장소의 액션이 사이트를 만들어 GitHub Pages에 띄운다
```

## 맥에서 돌려 보기

```
npm install
npm run sync          # 세컨브레인(~/SecondBrain/6_발행)에서 내용 가져오기
npm run sync:sample   # 예시 글 묶음(fixtures/)으로 채우기 — 화면 확인용
npm run build         # 사이트 만들기 + 검색 색인
npm run preview       # 만든 사이트 띄우기
```

## 구조

- `src/layouts/Desktop.astro` — 메뉴 줄, 독, 프로필 카드, 잠금화면, 창 넷(글·강의·자료실·연락), 신호등 버튼(닫기·접기·크게)·창 끌기·크기 조절·분류 거르기·밝기 전환
- `src/components/Window.astro` — 창 하나
- `src/pages/` — 주소별 페이지. 글 한 편은 `posts/[slug].astro`
- `scripts/export.mjs` — 세컨브레인 → `content/` 옮기기 (공개 표시 확인, 옵시디언 링크 바꾸기)
- `scripts/vault-workflow.yml` — 세컨브레인 저장소에 넣는 액션 원본
