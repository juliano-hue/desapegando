import os from 'node:os'
import path from 'node:path'

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR?.trim() || path.join(os.tmpdir(), 'desapegando-uploads')
}

