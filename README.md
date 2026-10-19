# CrazyConverter Workspace Upgrade

This is an incremental upgrade to the existing Vite + FFmpeg project. The existing FFmpeg converter and its core-loading setup are preserved.

## Included

- Existing audio/video converter, with GIF added as an output choice.
- Image Lab: browser-native WEBP/JPG/PNG conversion, quality control, preview, and optional AVIF export when the browser supports it.
- PDF Studio: merge multiple PDFs and create a PDF from selected images.
- Excel/CSV: convert the first worksheet to CSV or save workbook data as XLSX.
- Word: extract DOCX text to a TXT download and preview the extracted text.
- My Workspace: recent activity saved locally in this browser, plus optional Supabase Storage upload/list/download controls.

## Important limitations

- AVIF output depends on browser support. Animated GIFs may become a still image in Image Lab. Use the FFmpeg converter for video-to-GIF.
- Spreadsheet conversions do not preserve every Excel feature, macro, or workbook detail. DOCX-to-TXT does not preserve formatting or images.
- The first PDF/Office/Cloud operation loads its library from `esm.sh`, so those tools need an internet connection. Your selected file contents are processed in the browser for the image/PDF/Office tools; cloud upload is only performed when you explicitly choose it.
- The activity history is local to one browser/device. Supabase uploads are cloud files, but this starter does not yet provide account sign-in, per-user folders, or automatic cross-device history sync.

## Supabase cloud storage setup

1. Create a Supabase project.
2. In Storage, create a bucket, for example `crazyconverter-files`.
3. Configure Storage Row Level Security (RLS) policies appropriate for your intended access. Upload/list/download requires policies granting the relevant operations. Do not use a service-role secret in a browser app.
4. Open CrazyConverter → My Workspace and enter the project URL, anon/publishable key, and bucket name.
5. Choose a file and upload it. Use Refresh cloud files to list files, then Download to retrieve one.

The URL and public anon/publishable key are stored in this browser's localStorage. They are not embedded in the source code. Do not use an unrestricted bucket for private files.

## Run locally

```bash
npm install
npm run dev
```

Build for deployment:

```bash
npm run build
```

Deploy the **contents** of `dist` to Netlify, not the `dist` folder itself. Ensure the generated `dist/ffmpeg-core/` directory includes `ffmpeg-core.js` and `ffmpeg-core.wasm`.
