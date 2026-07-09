package com.cloudstorage.backend.service;

import org.springframework.stereotype.Service;

@Service
public class ClassificationService {

    public String classifyFile(String filename, String contentType) {
        if (filename == null) return "Other";
        int lastDot = filename.lastIndexOf(".");
        if (lastDot == -1) return "Other";
        String ext = filename.substring(lastDot + 1).toLowerCase();
        switch (ext) {
            case "pdf":
                if (filename.toLowerCase().contains("invoice") || filename.toLowerCase().contains("bill")) return "Invoice";
                if (filename.toLowerCase().contains("resume") || filename.toLowerCase().contains("cv")) return "Resume";
                if (filename.toLowerCase().contains("paper") || filename.toLowerCase().contains("research")) return "Research Paper";
                return "PDF Document";
            case "doc":
            case "docx":
                if (filename.toLowerCase().contains("resume") || filename.toLowerCase().contains("cv")) return "Resume";
                return "Legal Document";
            case "xls":
            case "xlsx":
            case "csv":
                return "Spreadsheet";
            case "ppt":
            case "pptx":
                return "Presentation";
            case "java":
            case "py":
            case "js":
            case "jsx":
            case "ts":
            case "tsx":
            case "html":
            case "css":
            case "cpp":
            case "c":
            case "json":
                return "Source Code";
            case "png":
            case "jpg":
            case "jpeg":
            case "gif":
            case "svg":
            case "webp":
                return "Image";
            case "mp4":
            case "avi":
            case "mkv":
            case "mov":
                return "Video";
            case "mp3":
            case "wav":
            case "ogg":
            case "flac":
                return "Audio";
            case "zip":
            case "rar":
            case "tar":
            case "gz":
                return "Compressed File";
            default:
                return "Other";
        }
    }
}
