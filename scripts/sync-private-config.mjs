import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configRoot = join(projectRoot, "env-config");
const configFiles = [
  ".env.local",
  ".env.development",
  ".env.production",
  "AGENTS.md",
];

const missingFiles = configFiles.filter(
  (fileName) => !existsSync(join(configRoot, fileName)),
);

if (missingFiles.length > 0) {
  console.error(
    [
      "비공개 설정 파일을 찾지 못했어요.",
      "먼저 `git submodule update --init --recursive`를 실행해 주세요.",
      `누락된 파일: ${missingFiles.join(", ")}`,
    ].join("\n"),
  );
  process.exit(1);
}

for (const fileName of configFiles) {
  copyFileSync(join(configRoot, fileName), join(projectRoot, fileName));
}

console.log("비공개 환경 설정과 AI 지침을 동기화했어요.");
