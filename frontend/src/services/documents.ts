import { request } from "./api/client";
import type { DocumentUploadResult } from "../pages/knowledge/types";

// 上传一份 Markdown 或 PDF 文档，并等待后端完成解析、向量化和入库。
export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return request<DocumentUploadResult>("/api/documents", {
    method: "POST",
    body: formData,
  });
}
