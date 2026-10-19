import './style.css'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { encode as encodeAvif } from '@jsquash/avif'


document.querySelector('#app').innerHTML = `
  <header class="navbar">
    <a class="brand" href="#">
      <span class="brand-icon">↻</span>
      CRAZY<span>CONVERTER</span>
    </a>
    <span class="free-badge">100% FREE TO START</span>
  </header>

  <main class="hero">
    <div class="eyebrow">✦ SIMPLE. FAST. FREE.</div>
    <h1>Convert files.<br><span>No crazy steps.</span></h1>
    <p class="subtitle">
      Convert audio, video, images, PDFs, and Office files in one simple place.
      Free to use, right in your browser.
    </p>

    <section class="converter">
      <div id="dropzone" class="dropzone">
        <div class="upload-icon">↑</div>
        <h2>Drop your file here</h2>
        <p>or choose a file from your computer</p>
        <button id="choose-file" class="primary-btn">Choose file</button>
        <input id="file-input" type="file" hidden>
        <p class="limit-note">Your file stays on your device in this demo.</p>
      </div>

      <div id="file-info" class="file-info" hidden>
        <div class="file-symbol">♫</div>
        <div class="file-details">
          <strong id="file-name"></strong>
          <span id="file-size"></span>
        </div>
        <button id="remove-file" class="remove-btn" aria-label="Remove file">×</button>
      </div>

      <div class="format-row">
        <div class="format-field">
          <label>OUTPUT FORMAT</label>
          <select id="format">
            <option value="mp3">MP3 Audio</option>
            <option value="wav">WAV Audio</option>
            <option value="mp4">MP4 Video</option>
            <option value="webm">WebM Video</option>
            <option value="gif">GIF Animation</option>
          </select>
        </div>
        <button id="convert-btn" class="convert-btn" disabled>
          Convert file <span>→</span>
        </button>
      </div>
      <p id="status" class="status" role="status">
        Choose a file to get started.
      </p>
    </section>

    <div class="trust-row">
      <span>✓ Free to use</span>
      <span>✓ No account needed</span>
      <span>✓ Browser-based demo</span>
    </div>
  </main>

  <section class="formats">
    <h2>One simple place for your files</h2>
    <p>Start with popular audio and video formats.</p>
    <div class="format-cards">
      <div class="format-card"><span>♫</span><strong>MP3</strong><small>Audio</small></div>
      <div class="format-card"><span>〰</span><strong>WAV</strong><small>Audio</small></div>
      <div class="format-card"><span>▶</span><strong>MP4</strong><small>Video</small></div>
      <div class="format-card"><span>▣</span><strong>WEBM</strong><small>Video</small></div>
    </div>
  </section>

  <footer>
    <a class="brand footer-brand" href="#">↻ CRAZYCONVERTER</a>
    <p>Simple file tools, made for everyone.</p>
    <small>Crazy Converter · Early prototype</small>
  </footer>
`

const input = document.querySelector('#file-input')
const choose = document.querySelector('#choose-file')
const dropzone = document.querySelector('#dropzone')
const fileInfo = document.querySelector('#file-info')
const convertBtn = document.querySelector('#convert-btn')
const status = document.querySelector('#status')

let selectedFile = null


let ffmpeg = null
let ffmpegLoading = false



async function loadFFmpeg() {
  if (ffmpeg) return true
  if (ffmpegLoading) return false

  ffmpegLoading = true
  status.textContent = 'Loading conversion engine...'

  try {
    ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      console.log(message)
    })

    const baseURL = '/ffmpeg-core'

    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    })

    status.textContent = 'Conversion engine ready!'
    return true
  } catch (error) {
    console.error('FFMPEG ERROR:', error)
    console.error('FFMPEG ERROR PROPERTIES:', Object.getOwnPropertyNames(error))
    console.error('FFMPEG ERROR CAUSE:', error?.cause)
    console.error('FFMPEG ERROR STACK:', error?.stack)

    status.textContent = 'Could not load conversion engine. Please check the browser console.'
    ffmpeg = null
    return false
  } finally {
    ffmpegLoading = false
  }
}




function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function showFile(file) {
  if (!file) return

  selectedFile = file
  document.querySelector('#file-name').textContent = file.name
  document.querySelector('#file-size').textContent = formatSize(file.size)
  dropzone.hidden = true
  fileInfo.hidden = false
  convertBtn.disabled = false
  status.textContent = 'File selected. Conversion engine is our next step.'
}

function clearFile() {
  selectedFile = null
  input.value = ''
  dropzone.hidden = false
  fileInfo.hidden = true
  convertBtn.disabled = true
  status.textContent = 'Choose a file to get started.'
}

choose.addEventListener('click', () => input.click())
input.addEventListener('change', () => showFile(input.files[0]))
document.querySelector('#remove-file').addEventListener('click', clearFile)

dropzone.addEventListener('dragover', event => {
  event.preventDefault()
  dropzone.classList.add('dragging')
})

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragging')
})

dropzone.addEventListener('drop', event => {
  event.preventDefault()
  dropzone.classList.remove('dragging')
  showFile(event.dataTransfer.files[0])
})


convertBtn.addEventListener('click', async () => {
  if (!selectedFile) return

  const format = document.querySelector('#format').value
  const outputName = `converted.${format}`

  status.textContent = 'Preparing conversion...'

  try {
    const ready = await loadFFmpeg()
    if (!ready) return

    status.textContent = 'Converting your file...'

    const inputName = selectedFile.name
    const outputFormat = format.toLowerCase()

    await ffmpeg.writeFile(
      inputName,
      new Uint8Array(await selectedFile.arrayBuffer())
    )

    await ffmpeg.exec([
      '-i', inputName,
      outputName
    ])

    const data = await ffmpeg.readFile(outputName)
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: 'application/octet-stream' })
    )

    const link = document.createElement('a')
    link.href = url
    link.download = outputName
    link.click()

    URL.revokeObjectURL(url)
    status.textContent = 'Conversion complete! Your download has started.'
  } catch (error) {
    console.error(error)
    status.textContent = 'Conversion failed. Check the browser console.'
  }
})

// CrazyConverter Workspace upgrade: these tools are separate from the existing FFmpeg converter.
const workspaceMarkup = `
<section class="workspace-section" id="workspace-tools">
  <div class="section-heading">
    <span class="eyebrow">✦ THE TOOLBOX</span>
    <h2>Your files, <span>more powerful.</span></h2>
    <p>Image, PDF, Office, and workspace tools in one place. Your files stay on your device unless you choose cloud upload.</p>
  </div>
  <div class="tool-tabs" role="tablist" aria-label="Workspace tools">
    <button class="tool-tab active" data-tool-tab="images" role="tab" aria-selected="true">▧ Image Lab</button>
    <button class="tool-tab" data-tool-tab="pdf" role="tab" aria-selected="false">▤ PDF Studio</button>
    <button class="tool-tab" data-tool-tab="office" role="tab" aria-selected="false">▦ Office Tools</button>
    <button class="tool-tab" data-tool-tab="workspace" role="tab" aria-selected="false">☁ My Workspace</button>
  </div>
  <div class="tool-panel active" data-tool-panel="images">
    <div class="tool-panel-head"><div><h3>Image Lab</h3><p>Convert common image formats using your browser's image engine.</p></div><span class="tool-pill">On-device</span></div>
    <label class="tool-label" for="image-file">Choose an image</label>
    <input id="image-file" class="tool-input" type="file" accept="image/*,.avif,.gif" multiple>
    <div id="image-preview-wrap" class="image-preview-wrap" hidden><img id="image-preview" alt="Selected image preview"><span id="image-dimensions"></span></div>
    <div class="tool-controls">
      <div><label class="tool-label" for="image-format">Output format</label><select id="image-format" class="tool-input"><option value="image/webp">WEBP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/avif">AVIF (browser support varies)</option></select></div>
      <div><label class="tool-label" for="image-quality">Quality <span id="quality-value">85%</span></label><input id="image-quality" type="range" min="30" max="100" value="85"></div>
    </div>
    <button id="image-convert" class="tool-action" disabled>Convert image ↓</button><p id="image-status" class="tool-status" role="status">Choose an image to begin.</p>
    <p class="tool-hint">Animated GIFs may become a still image here. Use the main FFmpeg converter for video-to-GIF conversion. AVIF export depends on browser support.</p>
  </div>
  <div class="tool-panel" data-tool-panel="pdf" hidden>
    <div class="tool-panel-head"><div><h3>PDF Studio</h3><p>Combine PDFs or turn images into a PDF, without uploading them to a server.</p></div><span class="tool-pill">On-device</span></div>
    <label class="tool-label" for="pdf-files">Select PDF files to merge</label><input id="pdf-files" class="tool-input" type="file" accept="application/pdf,.pdf" multiple>
    <button id="pdf-merge" class="tool-action" disabled>Merge selected PDFs ↓</button>
    <div class="tool-divider"></div>
    <label class="tool-label" for="pdf-image-files">Select images to make a PDF</label><input id="pdf-image-files" class="tool-input" type="file" accept="image/*,.avif" multiple>
    <button id="pdf-from-images" class="tool-action secondary-action" disabled>Create PDF from images ↓</button>
    <p id="pdf-status" class="tool-status" role="status">Choose files for a PDF task.</p>
    <p class="tool-hint">PDF tools load a small library on first use. Password-protected PDFs may not be supported.</p>
  </div>
  <div class="tool-panel" data-tool-panel="office" hidden>
    <div class="tool-panel-head"><div><h3>Office Tools</h3><p>Extract document text or convert spreadsheet data.</p></div><span class="tool-pill">On-device</span></div>
    <div class="office-tool-card"><strong>Excel / CSV</strong><p>Convert XLSX or CSV files to the other format.</p><label class="tool-label" for="sheet-file">Choose spreadsheet</label><input id="sheet-file" class="tool-input" type="file" accept=".xlsx,.xls,.csv,text/csv"><div class="tool-controls"><div><label class="tool-label" for="sheet-format">Output</label><select id="sheet-format" class="tool-input"><option value="csv">CSV</option><option value="xlsx">Excel (.xlsx)</option></select></div><div class="office-preview" id="sheet-preview">No spreadsheet selected yet.</div></div><button id="sheet-convert" class="tool-action" disabled>Convert spreadsheet ↓</button><p id="sheet-status" class="tool-status" role="status"></p></div>
    <div class="office-tool-card"><strong>Word documents</strong><p>Extract readable text from DOCX files and save it as a TXT file.</p><label class="tool-label" for="word-file">Choose Word document</label><input id="word-file" class="tool-input" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><button id="word-extract" class="tool-action secondary-action" disabled>Extract text ↓</button><p id="word-status" class="tool-status" role="status"></p><textarea id="word-preview" class="tool-input word-preview" placeholder="Extracted document text will appear here…" readonly hidden></textarea></div>
    <p class="tool-hint">Excel uses SheetJS and Word extraction uses Mammoth, loaded from esm.sh when needed. Complex formatting and macros are not preserved by conversions.</p>
  </div>
  <div class="tool-panel" data-tool-panel="workspace" hidden>
    <div class="tool-panel-head"><div><h3>My Workspace</h3><p>Keep a local activity list or connect your own Supabase storage for cloud uploads.</p></div><span class="tool-pill">Local + optional cloud</span></div>
    <div class="workspace-stats"><div><span id="history-count">0</span><small>Recent actions</small></div><div><span id="cloud-state">Not connected</span><small>Cloud status</small></div></div>
    <div class="office-tool-card"><strong>Recent activity</strong><p class="tool-hint">This list is saved in this browser only. It does not upload your files.</p><div id="history-list" class="history-list"><p>No activity yet. Completed downloads will appear here.</p></div><button id="clear-history" class="text-action">Clear local history</button></div>
    <div class="office-tool-card"><strong>Connect cloud storage</strong><p>Enter your own Supabase project details to upload files to a Storage bucket. Your credentials stay in this browser and are not sent to CrazyConverter.</p><label class="tool-label" for="supabase-url">Supabase project URL</label><input id="supabase-url" class="tool-input" type="url" placeholder="https://your-project.supabase.co" autocomplete="url"><label class="tool-label" for="supabase-key">Supabase anon / publishable key</label><input id="supabase-key" class="tool-input" type="password" placeholder="Your public anon/publishable key" autocomplete="off"><label class="tool-label" for="supabase-bucket">Storage bucket name</label><input id="supabase-bucket" class="tool-input" value="crazyconverter-files" placeholder="crazyconverter-files"><button id="save-cloud-settings" class="tool-action secondary-action">Save connection settings</button><label class="tool-label" for="cloud-file">Choose a file to upload</label><input id="cloud-file" class="tool-input" type="file"><button id="cloud-upload" class="tool-action" disabled>Upload to my cloud ↓</button><button id="cloud-refresh" class="tool-action secondary-action" disabled>Refresh cloud files</button><div id="cloud-files-list" class="history-list"><p>Connect your project to view cloud files.</p></div><p id="cloud-status" class="tool-status" role="status">Cloud is not connected.</p><p class="tool-hint">Setup required: create a Supabase Storage bucket and configure Storage RLS policies to allow only the access you intend. Never use a service-role secret in this website. Uploads will fail until your bucket policies permit them.</p></div>
  </div>
</section>`

document.querySelector('.formats').insertAdjacentHTML('beforebegin', workspaceMarkup)

const remoteImport = url => import(/* @vite-ignore */ url)
const safeName = name => name.replace(/[^a-z0-9._-]/gi, '_')
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  addHistory('Downloaded', filename)
}
function addHistory(action, name) {
  let items = []
  try { items = JSON.parse(localStorage.getItem('cc-history') || '[]') } catch {}
  items.unshift({ action, name, date: new Date().toLocaleString() })
  items = items.slice(0, 12)
  localStorage.setItem('cc-history', JSON.stringify(items))
  renderHistory()
}
function renderHistory() {
  const host = document.querySelector('#history-list')
  if (!host) return
  let items = []
  try { items = JSON.parse(localStorage.getItem('cc-history') || '[]') } catch {}
  document.querySelector('#history-count').textContent = String(items.length)
  host.innerHTML = items.length ? items.map(item => `<div class="history-item"><span><strong>${escapeText(item.name)}</strong><small>${escapeText(item.action)} · ${escapeText(item.date)}</small></span></div>`).join('') : '<p>No activity yet. Completed downloads will appear here.</p>'
}
function escapeText(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

document.querySelectorAll('[data-tool-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tool-tab]').forEach(tab => { const active = tab === button; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)) })
  document.querySelectorAll('[data-tool-panel]').forEach(panel => { const active = panel.dataset.toolPanel === button.dataset.toolTab; panel.hidden = !active; panel.classList.toggle('active', active) })
}))

// Image conversion via the browser's native image decoder/canvas encoder.
const imageFile = document.querySelector('#image-file')
const imageConvert = document.querySelector('#image-convert')
let currentImage = null
let selectedImages = []
imageFile.addEventListener('change', () => {
  selectedImages = Array.from(imageFile.files || [])
currentImage = selectedImages[0] || null
  imageConvert.disabled = !currentImage
  document.querySelector('#image-status').textContent = selectedImages.length ? `${selectedImages.length} image(s) selected. Ready to convert.` : 'Choose an image to begin.'
  const wrap = document.querySelector('#image-preview-wrap')
  if (!currentImage) { wrap.hidden = true; return }
  const oldUrl = document.querySelector('#image-preview').dataset.url
  if (oldUrl) URL.revokeObjectURL(oldUrl)
  const url = URL.createObjectURL(currentImage)
  const preview = document.querySelector('#image-preview')
  preview.dataset.url = url
  preview.src = url
  preview.onload = () => { document.querySelector('#image-dimensions').textContent = `${preview.naturalWidth} × ${preview.naturalHeight}px`; wrap.hidden = false }
})
document.querySelector('#image-quality').addEventListener('input', event => { document.querySelector('#quality-value').textContent = `${event.target.value}%` })
imageConvert.addEventListener('click', async () => {
  if (!currentImage) return
  const statusEl = document.querySelector('#image-status')
  const mime = document.querySelector('#image-format').value
  statusEl.textContent = 'Converting image…'
  try {
    const bitmap = await createImageBitmap(currentImage)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width; canvas.height = bitmap.height
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    bitmap.close?.()
    const quality = Number(document.querySelector('#image-quality').value) / 100

let blob

if (mime === 'image/avif') {
  const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
  const avifBuffer = await encodeAvif(imageData, { quality })
  blob = new Blob([avifBuffer], { type: 'image/avif' })
} else {
  blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality))
}
    if (!blob || (mime === 'image/avif' && blob.type !== 'image/avif')) throw new Error('This browser does not support AVIF export. Try WEBP, JPG, or PNG.')
    const ext = ({'image/webp':'webp','image/jpeg':'jpg','image/png':'png','image/avif':'avif'})[mime]
    downloadBlob(blob, `${currentImage.name.replace(/\.[^.]+$/, '')}.${ext}`)
    statusEl.textContent = `Done! Output: ${(blob.size / 1024).toFixed(1)} KB.`
  } catch (error) { statusEl.textContent = error.message || 'Could not convert this image.' }
})

// PDF operations powered by pdf-lib.
let pdfLibPromise
const getPdfLib = () => pdfLibPromise ||= remoteImport('https://esm.sh/pdf-lib@1.17.1')
const pdfFiles = document.querySelector('#pdf-files')
const pdfImageFiles = document.querySelector('#pdf-image-files')
pdfFiles.addEventListener('change', () => { document.querySelector('#pdf-merge').disabled = pdfFiles.files.length < 2; document.querySelector('#pdf-status').textContent = `${pdfFiles.files.length} PDF file(s) selected.` })
pdfImageFiles.addEventListener('change', () => { document.querySelector('#pdf-from-images').disabled = pdfImageFiles.files.length < 1; document.querySelector('#pdf-status').textContent = `${pdfImageFiles.files.length} image(s) selected.` })
document.querySelector('#pdf-merge').addEventListener('click', async () => {
  const statusEl = document.querySelector('#pdf-status')
  try {
    statusEl.textContent = 'Loading PDF tools…'
    const { PDFDocument } = await getPdfLib()
    const merged = await PDFDocument.create()
    for (const file of pdfFiles.files) { const pdf = await PDFDocument.load(await file.arrayBuffer()); const pages = await merged.copyPages(pdf, pdf.getPageIndices()); pages.forEach(page => merged.addPage(page)) }
    downloadBlob(new Blob([await merged.save()], { type: 'application/pdf' }), 'merged.pdf')
    statusEl.textContent = 'Merged PDF downloaded.'
  } catch (error) { statusEl.textContent = `PDF merge failed: ${error.message}` }
})
document.querySelector('#pdf-from-images').addEventListener('click', async () => {
  const statusEl = document.querySelector('#pdf-status')
  try {
    statusEl.textContent = 'Creating PDF…'
    const { PDFDocument } = await getPdfLib()
    const pdf = await PDFDocument.create()
    for (const file of pdfImageFiles.files) {
      const bytes = await file.arrayBuffer()
      let embedded
      if (/\.png$/i.test(file.name) || file.type === 'image/png') embedded = await pdf.embedPng(bytes)
      else if (/\.jpe?g$/i.test(file.name) || file.type === 'image/jpeg') embedded = await pdf.embedJpg(bytes)
      else {
        const bitmap = await createImageBitmap(file)
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
        canvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close?.()
        const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        embedded = await pdf.embedPng(await png.arrayBuffer())
      }
      const page = pdf.addPage([embedded.width, embedded.height]); page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
    }
    downloadBlob(new Blob([await pdf.save()], { type: 'application/pdf' }), 'images.pdf')
    statusEl.textContent = 'PDF created and downloaded.'
  } catch (error) { statusEl.textContent = `PDF creation failed: ${error.message}` }
})

// Spreadsheet conversion powered by SheetJS.
let xlsxPromise
const getXlsx = () => xlsxPromise ||= remoteImport('https://esm.sh/xlsx@0.18.5')
const sheetFile = document.querySelector('#sheet-file')
sheetFile.addEventListener('change', async () => {
  const file = sheetFile.files?.[0]
  document.querySelector('#sheet-convert').disabled = !file
  const preview = document.querySelector('#sheet-preview')
  if (!file) { preview.textContent = 'No spreadsheet selected yet.'; return }
  preview.textContent = 'Reading spreadsheet…'
  try {
    const XLSX = await getXlsx()
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })
    preview.textContent = `${workbook.SheetNames.length} sheet(s) · ${rows.length} row(s) in first sheet · ${workbook.SheetNames[0]}`
  } catch (error) { preview.textContent = `Could not read file: ${error.message}` }
})
document.querySelector('#sheet-convert').addEventListener('click', async () => {
  const statusEl = document.querySelector('#sheet-status')
  const file = sheetFile.files?.[0]
  if (!file) return
  try {
    statusEl.textContent = 'Converting spreadsheet…'
    const XLSX = await getXlsx()
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const out = document.querySelector('#sheet-format').value
    let blob, filename
    if (out === 'csv') { const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]); blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); filename = `${file.name.replace(/\.[^.]+$/, '')}.csv` }
    else { const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }); blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); filename = `${file.name.replace(/\.[^.]+$/, '')}.xlsx` }
    downloadBlob(blob, filename); statusEl.textContent = 'Spreadsheet converted and downloaded.'
  } catch (error) { statusEl.textContent = `Conversion failed: ${error.message}` }
})

// Word DOCX text extraction powered by Mammoth.
let mammothPromise
const getMammoth = () => mammothPromise ||= remoteImport('https://esm.sh/mammoth@1.8.0')
const wordFile = document.querySelector('#word-file')
wordFile.addEventListener('change', () => { document.querySelector('#word-extract').disabled = !wordFile.files?.length; document.querySelector('#word-status').textContent = wordFile.files?.length ? `Ready: ${wordFile.files[0].name}` : '' })
document.querySelector('#word-extract').addEventListener('click', async () => {
  const file = wordFile.files?.[0]
  if (!file) return
  const statusEl = document.querySelector('#word-status')
  try {
    statusEl.textContent = 'Extracting text…'
    const mammoth = await getMammoth()
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    const preview = document.querySelector('#word-preview')
    preview.value = result.value; preview.hidden = false
    downloadBlob(new Blob([result.value], { type: 'text/plain;charset=utf-8' }), `${file.name.replace(/\.docx$/i, '')}.txt`)
    statusEl.textContent = 'Text extracted. Formatting and images are not preserved in TXT.'
  } catch (error) { statusEl.textContent = `Word extraction failed: ${error.message}` }
})

// Local history is device-only. Supabase connection is optional and uses only the user's own project.
renderHistory()
document.querySelector('#clear-history').addEventListener('click', () => { localStorage.removeItem('cc-history'); renderHistory() })
const cloudConfigKey = 'cc-cloud-config'
let cloudConfig = null
try { cloudConfig = JSON.parse(localStorage.getItem(cloudConfigKey) || 'null') } catch {}
if (cloudConfig) {
  document.querySelector('#supabase-url').value = cloudConfig.url || ''
  document.querySelector('#supabase-key').value = cloudConfig.key || ''
  document.querySelector('#supabase-bucket').value = cloudConfig.bucket || 'crazyconverter-files'
  document.querySelector('#cloud-state').textContent = 'Configured'
  document.querySelector('#cloud-upload').disabled = false
  document.querySelector('#cloud-refresh').disabled = false
  document.querySelector('#cloud-status').textContent = 'Settings saved in this browser. Select a file to upload.'
}
document.querySelector('#save-cloud-settings').addEventListener('click', () => {
  const url = document.querySelector('#supabase-url').value.trim().replace(/\/$/, '')
  const key = document.querySelector('#supabase-key').value.trim()
  const bucket = document.querySelector('#supabase-bucket').value.trim()
  const statusEl = document.querySelector('#cloud-status')
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !key || !bucket) { statusEl.textContent = 'Enter a valid Supabase project URL, anon/publishable key, and bucket name.'; return }
  cloudConfig = { url, key, bucket }
  localStorage.setItem(cloudConfigKey, JSON.stringify(cloudConfig))
  document.querySelector('#cloud-state').textContent = 'Configured'
  document.querySelector('#cloud-upload').disabled = !document.querySelector('#cloud-file').files?.length
  document.querySelector('#cloud-refresh').disabled = false
  statusEl.textContent = 'Settings saved. Select a file to test an upload. Bucket permissions must allow it.'
})
document.querySelector('#cloud-file').addEventListener('change', event => { document.querySelector('#cloud-upload').disabled = !(cloudConfig && event.target.files?.length) })
document.querySelector('#cloud-refresh').addEventListener('click', async () => {
  const statusEl = document.querySelector('#cloud-status')
  const host = document.querySelector('#cloud-files-list')
  if (!cloudConfig) return
  try {
    statusEl.textContent = 'Loading cloud files…'
    const { createClient } = await remoteImport('https://esm.sh/@supabase/supabase-js@2')
    const client = createClient(cloudConfig.url, cloudConfig.key)
    const { data, error } = await client.storage.from(cloudConfig.bucket).list('', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
    if (error) throw error
    const files = (data || []).filter(item => item.name && item.id)
    host.innerHTML = files.length ? files.map(item => `<div class=\"history-item\"><span><strong>${escapeText(item.name)}</strong><small>${item.metadata?.size ? `${(item.metadata.size / 1024).toFixed(1)} KB` : 'Cloud file'}</small></span><button class=\"text-action\" data-cloud-download=\"${escapeText(item.name)}\">Download</button></div>`).join('') : '<p>No files found in the bucket root.</p>'
    host.querySelectorAll('[data-cloud-download]').forEach(button => button.addEventListener('click', async () => {
      try {
        const { data: blobData, error: downloadError } = await client.storage.from(cloudConfig.bucket).download(button.dataset.cloudDownload)
        if (downloadError) throw downloadError
        downloadBlob(blobData, button.dataset.cloudDownload.replace(/^\d+-/, ''))
      } catch (downloadError) { statusEl.textContent = `Download failed: ${downloadError.message}` }
    }))
    statusEl.textContent = `Found ${files.length} file(s).`
  } catch (error) { statusEl.textContent = `Could not list cloud files: ${error.message || error}. Check Storage list/read policies.` }
})

document.querySelector('#cloud-upload').addEventListener('click', async () => {
  const file = document.querySelector('#cloud-file').files?.[0]
  const statusEl = document.querySelector('#cloud-status')
  if (!file || !cloudConfig) return
  try {
    statusEl.textContent = 'Connecting to Supabase…'
    const { createClient } = await remoteImport('https://esm.sh/@supabase/supabase-js@2')
    const client = createClient(cloudConfig.url, cloudConfig.key)
    const path = `${Date.now()}-${safeName(file.name)}`
    const { error } = await client.storage.from(cloudConfig.bucket).upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })
    if (error) throw error
    statusEl.textContent = `Uploaded ${file.name} to ${cloudConfig.bucket}/${path}.`
    addHistory('Cloud upload', file.name)
  } catch (error) { statusEl.textContent = `Cloud upload failed: ${error.message || error}. Check the bucket name and Storage RLS policies.` }
})
