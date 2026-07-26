const ACCOUNT_PANEL_RETURN_KEY = "nalssilog-open-account-panel";

export function markAccountPanelReturn() {
  try {
    window.sessionStorage.setItem(ACCOUNT_PANEL_RETURN_KEY, "1");
  } catch {
    // 저장소가 차단된 환경에서는 프로필 화면으로만 복귀한다.
  }
}

export function consumeAccountPanelReturn() {
  try {
    const shouldOpen = window.sessionStorage.getItem(ACCOUNT_PANEL_RETURN_KEY) === "1";
    window.sessionStorage.removeItem(ACCOUNT_PANEL_RETURN_KEY);
    return shouldOpen;
  } catch {
    return false;
  }
}
