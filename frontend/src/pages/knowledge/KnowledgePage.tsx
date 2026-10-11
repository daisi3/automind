import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { uploadDocument } from "../../services/documents";
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  ACCEPTED_DOCUMENT_SUFFIXES,
  ACCEPTED_DOCUMENT_LABEL,
  MAX_DOCUMENT_SIZE,
} from "./constants";
import type { DocumentUploadResult } from "./types";

// 管理知识库文档的选择、上传与本次入库结果。
function KnowledgePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentUploadResult | null>(null);

  // 校验浏览器选择的文件，避免无效文件进入上传流程。
  function selectFile(file: File | undefined) {
    if (!file) return;

    const isSupportedFile = ACCEPTED_DOCUMENT_SUFFIXES.some((suffix) =>
      file.name.toLowerCase().endsWith(suffix),
    );
    if (!isSupportedFile) {
      setError("目前只支持上传 .md Markdown 或 .pdf PDF 文件");
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setError("文件不能超过 5 MB");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
  }

  // 处理文件选择控件的结果。
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = ""; // 清空控件，允许重新选择同名文件。
  }

  // 接收拖拽到上传区域的首个文件。
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  // 允许键盘用户触发隐藏的文件选择控件。
  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  // 提交选中的文档，并显示后端完成入库后的统计结果。
  async function handleUpload() {
    if (!selectedFile || isUploading) return;

    setError(null);
    setResult(null);
    setIsUploading(true);

    try {
      const uploadResult = await uploadDocument(selectedFile);
      setResult(uploadResult);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "文档上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  const formattedSize = selectedFile
    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
    : "";

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#fafafa] md:h-[100dvh]">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-10 md:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-emerald-700">
            KNOWLEDGE BASE
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-zinc-950">
            导入知识资料
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-zinc-500">
            上传 Markdown 或 PDF 文档后，系统会自动解析内容、切分文本并建立检索索引。
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7" aria-labelledby="upload-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900" id="upload-title">
                上传文档
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                当前支持 {ACCEPTED_DOCUMENT_LABEL}，Markdown 需为 UTF-8 编码，单个文件不超过 5 MB。
              </p>
            </div>
          </div>

          <input
            accept={ACCEPTED_DOCUMENT_EXTENSIONS}
            className="hidden"
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
          />

          <div
            className={`mt-6 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
              isDragging
                ? "border-emerald-600 bg-emerald-50"
                : "border-zinc-300 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onKeyDown={handleDropzoneKeyDown}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-white text-zinc-600 shadow-sm">
              <FileUp className="size-5" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-sm font-medium text-zinc-800">
              拖拽文件至此处，或点击选择文件
            </p>
            <p className="mt-1 text-xs text-zinc-500">支持 .md、.pdf · 最大 5 MB</p>
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <FileText className="size-5 shrink-0 text-emerald-700" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-800">{selectedFile.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{formattedSize}</p>
              </div>
              {!isUploading && (
                <button
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
                  type="button"
                  aria-label="移除已选择的文件"
                  onClick={() => {
                    setSelectedFile(null);
                    setResult(null);
                    setError(null);
                  }}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 flex items-center gap-2 text-sm text-red-600" role="alert">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-zinc-100 pt-5">
            <p className="text-xs leading-5 text-zinc-400">
              同名文件再次上传时，会替换已有文档及其索引。
            </p>
            <Button
              className="shrink-0"
              disabled={!selectedFile || isUploading}
              type="button"
              onClick={handleUpload}
            >
              {isUploading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isUploading ? "正在入库" : "上传并入库"}
            </Button>
          </div>
        </section>

        {isUploading && (
          <section className="mt-5 rounded-xl border border-zinc-200 bg-white px-5 py-4" aria-live="polite">
            <div className="flex items-center gap-3 text-sm text-zinc-600">
              <LoaderCircle className="size-4 animate-spin text-emerald-700" />
              正在解析文档、切分文本并建立索引，请稍候…
            </div>
          </section>
        )}

        {result && (
          <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-4" aria-live="polite">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-950">已完成解析与入库</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                  {result.filename} 已生成 {result.chunks} 个文本片段。
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-900/60">
                  当前上传结果已写入知识库，可在知识库问答或 Agent 模式中检索。
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default KnowledgePage;
