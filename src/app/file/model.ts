import fse from 'fs-extra'
import path from 'path'
import { uploadToAzure, removeFromAzure } from 'utils/tools'
import AppService from 'utils/base/AppService'
import { File } from 'types'

export default class FileModel extends AppService {
  async moveFile(des_dir: string, src: string, des: string) {
    await fse.ensureDir(des_dir)
    return fse.move(src, des, { overwrite: true })
  }

  async moveUploadedFile(file: File, upload_path: string) {
    const file_des = path.join(upload_path, file.name)
    await uploadToAzure(file.path, file_des)
    return file_des
  }

  async removeOldFile(file_path: string) {
    return removeFromAzure(file_path)
  }
}
