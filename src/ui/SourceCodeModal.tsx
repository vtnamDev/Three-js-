import { useEffect, useState } from 'react';
import { Check, Copy, Download, FileCode2, X } from 'lucide-react';

export interface SourceFileEntry {
  path: string;
  sizeBytes: number;
  content: string;
}

export interface SourceCodeModalProps {
  open: boolean;
  onClose: () => void;
}

export function SourceCodeModal({ open, onClose }: SourceCodeModalProps) {
  const [files, setFiles] = useState<SourceFileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('src/App.tsx');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!open || files.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/source-files')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { files?: SourceFileEntry[] };
        if (!cancelled && Array.isArray(data.files)) {
          setFiles(data.files);
          if (data.files.length > 0 && !data.files.some((f) => f.path === selectedPath)) {
            setSelectedPath(data.files[0].path);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Đang chạy ở chế độ tĩnh không có máy chủ đọc tệp trực tiếp. Bạn có thể tải trọn bộ mã nguồn qua nút Tải ZIP bên dưᶻ�q�^