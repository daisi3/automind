// 与后端 MAX_UPLOAD_SIZE 保持一致。
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_EXTENSIONS = ".md,.pdf";

export const ACCEPTED_DOCUMENT_SUFFIXES = [".md", ".pdf"] as const;

export const ACCEPTED_DOCUMENT_LABEL = "Markdown（.md）或 PDF（.pdf）";
