"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import Modal from "./Modal";
import Button from "./Button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo de alerta (ícone + botão vermelho) para ações destrutivas. */
  danger?: boolean;
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<ConfirmState | null>(null);
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function settle(result: boolean) {
    state?.resolve(result);
    setState(null);
    setLoading(false);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && (
        <Modal
          title={state.options.title}
          open
          onClose={() => settle(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => settle(false)}>
                {state.options.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                variant={state.options.danger ? "danger" : "primary"}
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  settle(true);
                }}
              >
                {state.options.confirmLabel ?? "Confirmar"}
              </Button>
            </>
          }
        >
          <div className="flex gap-3">
            {state.options.danger && (
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle size={18} aria-hidden="true" />
              </div>
            )}
            {state.options.description && (
              <p className="text-sm leading-relaxed text-[#45566a]">
                {state.options.description}
              </p>
            )}
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

/** `await confirm({ title, description, danger }) => boolean`. */
export function useConfirmDialog() {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirmDialog deve ser usado dentro de <ConfirmDialogProvider>.");
  }
  return confirm;
}
