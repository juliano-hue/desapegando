import { Router, type Request, type Response } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'
import multer from 'multer'
import { requireAuth } from '../auth.js'
import { getUploadDir } from '../uploadDir.js'

const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
})

const schema = z.object({
  dataUrl: z.string().min(1),
})

function getImageExt(mime: string, originalName?: string): 'png' | 'webp' | 'jpg' | null {
  const m = (mime ?? '').toLowerCase().trim()
  if (m.startsWith('image/')) {
    if (m.includes('png')) return 'png'
    if (m.includes('webp')) return 'webp'
    if (m.includes('jpeg') || m.includes('jpg') || m.includes('pjpeg') || m.includes('jfif')) return 'jpg'
  }

  const ext = originalName ? path.extname(originalName).toLowerCase() : ''
  if (ext === '.png') return 'png'
  if (ext === '.webp') return 'webp'
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.jfif') return 'jpg'
  return null
}

async function writeImage(buf: Buffer, mime: string, originalName?: string): Promise<string> {
  const ext = getImageExt(mime, originalName)
  if (!ext) throw new Error('Formato não suportado')
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const uploadDir = getUploadDir()
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, fileName), buf)
  return fileName
}

router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Dados inválidos' })
    return
  }

  const dataUrl = parsed.data.dataUrl
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    res.status(400).json({ success: false, error: 'Imagem inválida' })
    return
  }

  const mime = match[1]
  const b64 = match[2]
  const buf = Buffer.from(b64, 'base64')
  let fileName = ''
  try {
    fileName = await writeImage(buf, mime)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[uploads] falha no upload (dataUrl)', { mime, err: msg })
    if (msg.includes('Formato não suportado')) {
      res.status(400).json({ success: false, error: 'Formato não suportado' })
      return
    }
    res.status(500).json({ success: false, error: 'Falha ao salvar imagem' })
    return
  }

  const baseUrl = process.env.API_PUBLIC_ORIGIN ?? 'http://localhost:3002'
  res.status(201).json({ success: true, url: `${baseUrl}/uploads/${fileName}` })
})

router.post('/file', requireAuth, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const f = req.file
  if (!f?.buffer || !f.mimetype) {
    res.status(400).json({ success: false, error: 'Arquivo ausente' })
    return
  }
  let fileName = ''
  try {
    fileName = await writeImage(f.buffer, f.mimetype, f.originalname)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[uploads] falha no upload (file)', { mime: f.mimetype, name: f.originalname, size: f.size, err: msg })
    if (msg.includes('Formato não suportado')) {
      res.status(400).json({ success: false, error: 'Formato não suportado' })
      return
    }
    res.status(500).json({ success: false, error: 'Falha ao salvar imagem' })
    return
  }
  const baseUrl = process.env.API_PUBLIC_ORIGIN ?? 'http://localhost:3002'
  res.status(201).json({ success: true, url: `${baseUrl}/uploads/${fileName}` })
})

export default router
