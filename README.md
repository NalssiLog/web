# 너의 날씨는 (Your Weather)

같은 동네의 이웃들이 직접 느낀 현재 날씨를 사진과 함께 공유하는 모바일 웹 MVP입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 검사 및 배포 빌드

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## API 모드

기본 설정은 메모리 기반 Mock API입니다. Spring Boot API를 연결할 때 `.env.local`에 아래 값을 설정합니다.

```env
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Mock과 실제 fetch 구현은 각각 `lib/api/mock-weather-api.ts`, `lib/api/http-weather-api.ts`에 분리되어 있습니다.
