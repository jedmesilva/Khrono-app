import React, { createContext, useCallback, useContext, useState } from "react";

export type DocType = "RG" | "CNH" | "Passaporte";
export type DocStatus = "analise" | "verificado" | "invalido";

export type DocFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export type SubmittedDoc = {
  id: string;
  type: DocType;
  status: DocStatus;
  files: DocFile[];
  submittedAt: string;
};

type DocumentsContextValue = {
  documents: SubmittedDoc[];
  addDocument: (doc: Omit<SubmittedDoc, "id" | "submittedAt">) => void;
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<SubmittedDoc[]>([]);

  const addDocument = useCallback((doc: Omit<SubmittedDoc, "id" | "submittedAt">) => {
    const newDoc: SubmittedDoc = {
      ...doc,
      id: Math.random().toString(36).slice(2),
      submittedAt: new Date().toLocaleDateString("pt-BR"),
    };
    setDocuments((prev) => [...prev, newDoc]);
  }, []);

  return (
    <DocumentsContext.Provider value={{ documents, addDocument }}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used inside DocumentsProvider");
  return ctx;
}
