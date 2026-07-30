"use client";

import { useCallback, useEffect, useId, useRef } from "react";

const MODAL_HISTORY_KEY = "__nalssilogModal";
const MODAL_HISTORY_VALUE = "open";

interface ModalLayer {
  id: string;
  onBack: () => void;
  onDismiss: () => void;
}

interface PendingDismiss {
  id: string;
  afterDismiss?: () => void;
}

const modalLayers: ModalLayer[] = [];
let pendingDismiss: PendingDismiss | null = null;
let ensureTimer: number | null = null;
let isListening = false;
let ignoreNextPop = false;

const hasModalHistoryEntry = () =>
  typeof window !== "undefined"
  && window.history.state?.[MODAL_HISTORY_KEY] === MODAL_HISTORY_VALUE;

const pushModalHistoryEntry = () => {
  if (hasModalHistoryEntry()) return;
  const currentState = window.history.state;
  const nextState = currentState && typeof currentState === "object"
    ? { ...currentState, [MODAL_HISTORY_KEY]: MODAL_HISTORY_VALUE }
    : { [MODAL_HISTORY_KEY]: MODAL_HISTORY_VALUE };
  window.history.pushState(nextState, "", window.location.href);
};

const scheduleHistorySync = () => {
  if (ensureTimer) window.clearTimeout(ensureTimer);
  ensureTimer = window.setTimeout(() => {
    ensureTimer = null;
    if (modalLayers.length > 0) {
      pushModalHistoryEntry();
      return;
    }

    // 외부 성공 콜백처럼 상태가 직접 닫힌 경우에도 보이지 않는 모달
    // history 항목이 남지 않도록 같은 URL의 sentinel을 소비한다.
    if (hasModalHistoryEntry()) {
      ignoreNextPop = true;
      ensurePopStateListener();
      window.history.back();
      return;
    }
    removePopStateListenerWhenIdle();
  }, 0);
};

const handlePopState = (event: PopStateEvent) => {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    event.stopImmediatePropagation();
    if (modalLayers.length > 0) pushModalHistoryEntry();
    else removePopStateListenerWhenIdle();
    return;
  }

  const topLayer = modalLayers.at(-1);
  if (!topLayer) return;
  event.stopImmediatePropagation();

  const requestedDismiss = pendingDismiss;
  pendingDismiss = null;
  let afterDismiss: (() => void) | undefined;

  if (requestedDismiss) {
    const requestedLayer = modalLayers.find((layer) => layer.id === requestedDismiss.id);
    (requestedLayer ?? topLayer).onDismiss();
    afterDismiss = requestedDismiss.afterDismiss;
  } else {
    topLayer.onBack();
  }

  // 하위 모달을 닫았거나 패널의 서브 화면에서 돌아온 경우에는
  // 남아 있는 최상위 모달을 위해 동일 URL의 history 항목을 다시 둔다.
  scheduleHistorySync();
  if (afterDismiss) window.setTimeout(afterDismiss, 0);
};

const ensurePopStateListener = () => {
  if (isListening) return;
  window.addEventListener("popstate", handlePopState, true);
  isListening = true;
};

const removePopStateListenerWhenIdle = () => {
  if (!isListening || modalLayers.length > 0) return;
  window.removeEventListener("popstate", handlePopState, true);
  isListening = false;
};

const registerModalLayer = (layer: ModalLayer) => {
  const existingIndex = modalLayers.findIndex((candidate) => candidate.id === layer.id);
  if (existingIndex >= 0) modalLayers.splice(existingIndex, 1);
  modalLayers.push(layer);
  ensurePopStateListener();
  pushModalHistoryEntry();

  return () => {
    const index = modalLayers.findIndex((candidate) => candidate.id === layer.id);
    if (index >= 0) modalLayers.splice(index, 1);
    if (pendingDismiss?.id === layer.id) pendingDismiss = null;
    scheduleHistorySync();
  };
};

const dismissModalLayer = (id: string, afterDismiss?: () => void) => {
  const requestedLayer = modalLayers.find((layer) => layer.id === id);
  if (!requestedLayer) {
    afterDismiss?.();
    return;
  }

  if (!hasModalHistoryEntry()) {
    requestedLayer.onDismiss();
    scheduleHistorySync();
    if (afterDismiss) window.setTimeout(afterDismiss, 0);
    return;
  }

  if (pendingDismiss) return;
  pendingDismiss = { id, afterDismiss };
  window.history.back();
};

/**
 * 열린 모달 위에 현재 URL과 같은 history 항목을 하나 둔다.
 * 모바일/브라우저 뒤로가기는 페이지보다 최상위 모달에 먼저 전달된다.
 */
export function useModalNavigation({
  open,
  onBack,
  onDismiss = onBack,
}: {
  open: boolean;
  onBack: () => void;
  onDismiss?: () => void;
}) {
  const reactId = useId();
  const layerId = `modal-${reactId}`;
  const onBackRef = useRef(onBack);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onBackRef.current = onBack;
    onDismissRef.current = onDismiss;
  }, [onBack, onDismiss]);

  useEffect(() => {
    if (!open) return;
    return registerModalLayer({
      id: layerId,
      onBack: () => onBackRef.current(),
      onDismiss: () => onDismissRef.current(),
    });
  }, [layerId, open]);

  return useCallback(
    (afterDismiss?: () => void) => dismissModalLayer(layerId, afterDismiss),
    [layerId],
  );
}
