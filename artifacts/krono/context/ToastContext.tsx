import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Toast } from "@/components/Toast";

type ToastType = "success" | "error" | "info";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = "success", duration = 2800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ visible: true, message, type });
    timerRef.current = setTimeout(
      () => setState((s) => ({ ...s, visible: false })),
      duration
    );
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toast visible={state.visible} message={state.message} type={state.type} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.show;
}
