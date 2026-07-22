# 프론트엔드 로깅 전략

## 구조

로깅은 `lib/logging` 아래의 OOP 구조로 관리한다.

- `Logger`: 로그 수준, 범위(scope), 공통 문맥을 조합한다.
- `LogSink`: 출력 대상 인터페이스다.
- `ConsoleLogSink`: 브라우저와 서버 콘솔에 출력한다.
- `SentryLogSink`: 설정된 환경에서 경고와 오류를 원격 수집한다.
- `sanitizer`: 모든 Sink에 전달하기 전에 민감정보를 제거한다.

화면이나 API 모듈에서는 `console` 또는 Sentry SDK를 직접 호출하지 않는다.

```ts
import { logger } from "@/lib/logging";

const authLogger = logger.child("auth.callback");

authLogger.info("signup_required", { provider: "KAKAO" });
authLogger.error("session_confirmation_failed", error, { result: "FAILED" });
```

## 환경별 정책

| 환경 | `NEXT_PUBLIC_APP_ENV` | 콘솔 최소 수준 | 원격 수집 |
|---|---|---|---|
| 로컬 PC | `local` | `debug` | 사용하지 않음 |
| Vercel Preview | `development` | `info` | DSN 설정 시 `warn`, `error` |
| Vercel Production | `production` | `warn` | DSN 설정 시 `warn`, `error` |

Vercel Preview와 Production은 모두 production build이므로 `NODE_ENV` 대신 `NEXT_PUBLIC_APP_ENV`로 구분한다.

## 환경변수

브라우저 오류 수집을 활성화하려면 Vercel 환경변수에 아래 값을 설정한다.

```text
NEXT_PUBLIC_SENTRY_DSN=<Sentry 프로젝트 DSN>
SENTRY_ORG=<Sentry 조직 slug>
SENTRY_PROJECT=<Sentry 프로젝트 slug>
SENTRY_AUTH_TOKEN=<Source Map 업로드 토큰>
```

`SENTRY_AUTH_TOKEN`은 Git 또는 `NEXT_PUBLIC_` 변수에 넣지 않는다. Vercel의 암호화된 환경변수로만 관리한다.

## 기록 기준

- `debug`: 로컬 진단, 재시도와 내부 상태 전환
- `info`: 정상적인 주요 흐름과 사용자가 직접 취소한 작업
- `warn`: 기능은 계속 동작하지만 운영 확인이 필요한 실패
- `error`: 서버 5xx, 네트워크 단절, 업로드 실패, 처리되지 않은 예외

400 검증 실패, 404, OAuth 사용 취소처럼 예상 가능한 결과는 원격 오류로 올리지 않는다.

## 기록 금지 정보

정제 계층은 다음 정보를 제거한다.

- 이름, 닉네임, 이메일
- 사용자가 작성한 글과 요청 body
- 정확한 위도·경도
- 쿠키, Authorization, CSRF와 인증 토큰
- Presigned URL 및 이미지 URL
- URL의 query string과 fragment

새 로그 문맥을 추가할 때도 위 정보는 애초에 전달하지 않는 것을 우선한다.
