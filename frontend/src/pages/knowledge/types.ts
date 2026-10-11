// 后端完成 Markdown 解析和入库后返回的结果。
export interface DocumentUploadResult {
  filename: string;
  category: string;
  documents: number;
  chunks: number;
}
