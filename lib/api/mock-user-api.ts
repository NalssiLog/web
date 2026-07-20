const unavailableNicknames = new Set([
  "구름산책",
  "강남산책러",
  "날씨요정",
  "파란하늘",
  "우산수집가",
  "동네한바퀴",
  "관리자",
  "운영자",
]);

export async function checkNicknameAvailability(nickname: string, currentNickname: string) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return nickname === currentNickname || !unavailableNicknames.has(nickname);
}
