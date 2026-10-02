# 이정민 홈페이지

- 내용(`content/`, `public/attachments/`)은 세컨브레인 `~/SecondBrain/6_발행/`이 원본이다. 여기서 직접 고치지 말고 세컨브레인에서 고친 뒤 `npm run sync`.
- 화면 확인은 `npm run sync:sample && npm run build && npx astro preview --port 4329` (preview는 알아서 뒤에서 돈다. 끝낼 땐 `npx astro preview stop`). 확인이 끝나면 `npm run sync`로 진짜 내용으로 되돌린다 — 예시 글이 커밋되면 그대로 공개된다.
- 디자인은 바탕화면 콘셉트로 정민이 확정했다(2026-10-02). 흰 바탕·검정·가는 선·빨간색 하나. 화면 문구는 건조한 명사형, 빈 창에 안내 문구를 넣지 않는다.
- main에 올리면 바로 공개 배포된다. 올리기 전에 정민 확인을 받는다.
- Astro 문서: https://docs.astro.build
