import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  File,
} from 'lucide-react';

export function getFileIcon(name: string, type: 'FILE' | 'FOLDER') {
  if (type === 'FOLDER') {
    return Folder;
  }

  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'txt':
    case 'md':
    case 'pdf':
    case 'doc':
    case 'docx':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return FileImage;
    case 'mp4':
    case 'mkv':
    case 'mov':
    case 'webm':
      return FileVideo;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return FileAudio;
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return FileArchive;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'java':
    case 'py':
    case 'go':
    case 'sh':
      return FileCode;
    default:
      return File;
  }
}

export function formatSize(bytes: number | null): string {
  if (bytes === null) return '-';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

