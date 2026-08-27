'use client'

import { useRef, useState } from 'react'
import { Check, ChevronDown, CloudUpload, FileVideo, LockKeyhole, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

const qualityOptions = [
  { id: 'highest', title: 'Highest', description: 'Best visual quality, largest file size' },
  { id: 'standard', title: 'Standard', description: 'Balanced quality and file size' },
  { id: 'low', title: 'Low', description: 'Fast conversion, smallest file size' },
]

export default function Page() {
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState('standard')
  const [format, setFormat] = useState('MP4')
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)
  const [conversionStage, setConversionStage] = useState<'uploading' | 'processing' | 'completed'>('uploading')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptFile = (nextFile?: File) => {
    if (nextFile?.type.startsWith('video/')) {
      setFile(nextFile)
      setConversionProgress(0)
      setDownloadUrl(null)
      setErrorMessage(null)
    }
  }

  const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  const uploadFile = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append('video', file)
    formData.append('quality', quality)
    formData.append('format', format.toLowerCase())

    let processingTimer: ReturnType<typeof setInterval> | undefined
    const startProcessing = () => {
      if (processingTimer) return

      setConversionStage('processing')
      processingTimer = setInterval(() => {
        setConversionProgress((currentProgress) => {
          if (currentProgress >= 95) return currentProgress
          return Math.min(95, currentProgress + Math.max(1, Math.ceil((95 - currentProgress) / 12)))
        })
      }, 700)
    }

    try {
      setIsConverting(true)
      setConversionProgress(2)
      setConversionStage('uploading')
      setErrorMessage(null)
      setDownloadUrl(null)
      const response = await axios.post<{ data: { downloadUrl: string } }>(`${API_BASE_URL}/compress`, formData, {
        onUploadProgress: ({ loaded, total }) => {
          const uploadPercent = total ? Math.round((loaded / total) * 30) : 15
          setConversionProgress(Math.max(2, Math.min(30, uploadPercent)))
          if (total && loaded >= total) startProcessing()
        },
      })
      startProcessing()
      setConversionProgress(100)
      setConversionStage('completed')
      setDownloadUrl(response.data.data.downloadUrl)
    } catch (error) {
      setErrorMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.message ?? 'Tidak bisa terhubung ke backend.'
          : 'Terjadi kesalahan saat memproses video.',
      )
    } finally {
      if (processingTimer) clearInterval(processingTimer)
      setIsConverting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-7 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" strokeWidth={2.5} />
          </div>
          <span className="font-sans text-[15px] font-bold tracking-tight">FrameShift</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Secure & private
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-6 pb-14 pt-8 lg:px-10 lg:pt-10">
        <div className="mb-10 max-w-2xl">
          <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Video utility / 01</p>
          <h1 className="max-w-xl text-balance font-sans text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl">Convert video, without the complexity.</h1>
          <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-muted-foreground">A focused workspace for fast, high-quality video conversion. Drop a file, choose your output, and let FrameShift handle the rest.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-[0_16px_50px_-30px_oklch(0.2_0.04_235)] sm:p-8" aria-labelledby="upload-heading">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Step one</p>
                <h2 id="upload-heading" className="text-xl font-semibold tracking-tight">Upload your source</h2>
              </div>
              <span className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-[10px] font-medium text-muted-foreground">MAX 2 GB</span>
            </div>

            <input ref={inputRef} type="file" accept="video/*" className="sr-only" onChange={(event) => acceptFile(event.target.files?.[0])} />
            <button
              type="button"
              className={`flex min-h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center transition-colors ${isDragging ? 'border-primary bg-accent' : 'border-border bg-muted/35 hover:border-primary/50 hover:bg-accent/50'}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files?.[0]) }}
            >
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {file ? <FileVideo className="size-7" strokeWidth={1.7} /> : <CloudUpload className="size-7" strokeWidth={1.7} />}
              </div>
              {file ? (
                <>
                  <span className="max-w-full truncate text-sm font-semibold">{file.name}</span>
                  <span className="mt-2 font-mono text-[11px] text-muted-foreground">{formatSize(file.size)} · Ready to convert</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold">Upload your video here</span>
                  <span className="mt-2 text-xs text-muted-foreground">Drag and drop, or browse from your device</span>
                </>
              )}
              <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5">
                <Upload className="size-3.5" /> Browse Files
              </span>
            </button>

            <div className="mt-8 border-t border-border pt-6">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-medium">{file ? 'Ready to convert' : 'Waiting for upload'}</span>
                <span className="font-mono text-muted-foreground">{file ? '100%' : '0%'}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={file ? 100 : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: file ? '100%' : '0%' }} />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`size-1.5 rounded-full ${file ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                {file ? 'File uploaded successfully' : 'Your file stays on your device until conversion begins'}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-[0_16px_50px_-30px_oklch(0.2_0.04_235)] sm:p-8" aria-labelledby="options-heading">
            <div className="mb-7">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Step two</p>
              <h2 id="options-heading" className="text-xl font-semibold tracking-tight">Set conversion options</h2>
            </div>

            <label htmlFor="format" className="mb-3 block text-sm font-semibold">Convert to:</label>
            <div className="relative">
              <select id="format" value={format} onChange={(event) => setFormat(event.target.value)} className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3.5 text-sm font-semibold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20">
                <option>MP4</option><option>AVI</option><option>MOV</option><option>WEBM</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <fieldset className="mt-8">
              <legend className="mb-3 text-sm font-semibold">Output Quality</legend>
              <div className="flex flex-col gap-3">
                {qualityOptions.map((option) => (
                  <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${quality === option.id ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'}`}>
                    <input type="radio" name="quality" value={option.id} checked={quality === option.id} onChange={() => setQuality(option.id)} className="mt-1 accent-primary" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-sm font-semibold">{option.title}</span><span className="text-xs leading-5 text-muted-foreground">{option.description}</span></span>
                    {quality === option.id && <Check className="mt-0.5 size-4 shrink-0 text-primary" />}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-4 rounded-2xl border border-border bg-muted/45 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><LockKeyhole className="size-4 text-primary" /><span>Your files are processed securely and deleted after conversion.</span></div>
          <button type="button" disabled={!file || isConverting} onClick={uploadFile} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:bg-muted-foreground/30 disabled:text-background disabled:shadow-none disabled:hover:translate-y-0">{isConverting ? 'Converting...' : 'Convert Video'}</button>
        </div>

        {(isConverting || conversionProgress === 100) && (
          <section className="mt-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-sm" aria-live="polite" aria-label="Conversion progress">
            <div className="mb-3 flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <span className={`size-2 rounded-full ${conversionStage === 'completed' ? 'bg-primary' : 'bg-primary animate-pulse'}`} />
                {conversionStage === 'uploading' && 'Mengunggah video...'}
                {conversionStage === 'processing' && 'Sedang mengonversi video...'}
                {conversionStage === 'completed' && 'Konversi selesai'}
              </div>
              <span className="font-mono text-sm font-semibold text-primary">{conversionProgress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={conversionProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Conversion progress">
              <div className="conversion-progress-shimmer relative h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${conversionProgress}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {conversionStage === 'processing' ? 'Video sedang diproses. Waktu yang dibutuhkan tergantung ukuran video.' : conversionStage === 'completed' ? 'File Anda siap diunduh.' : 'Menyiapkan video untuk diproses.'}
            </p>
          </section>
        )}

        {errorMessage && <p role="alert" className="mt-4 text-sm text-destructive">{errorMessage}</p>}
        {downloadUrl && <a href={downloadUrl} download className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Download converted video</a>}

        <footer className="mt-10 flex flex-col gap-2 border-t border-border pt-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>FrameShift · Professional media tools</span><span>Supports MP4, AVI, MOV, WEBM</span></footer>
      </section>
    </main>
  )
}
