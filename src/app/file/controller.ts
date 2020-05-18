import path from 'path'
import mime from 'mime-types'
import AppService from 'utils/base/AppService'
import { Request, File } from 'types'
import { Response } from 'restify'
import { Controller } from 'utils/decorators/Controller'
import { Get, Post } from 'utils/decorators/Routes'
import uuid from 'uuid/v4'
import { NotFoundError } from 'restify-errors'

@Controller('/file', 'File')
export default class FileController extends AppService {
  // @Get('/download')
  // async downloadFile({ params }: Request, res: Response) {
  //   const { node, id, type, attachment } = params
  //   const record = await this.DB.find(node, id)
  //   if (!record || !record[type]) {
  //     throw new NotFoundError('Resource Not Found')
  //   }
  //   const filename = record[type]
  //   const file_path = path.join(node, id, type, filename)
  //   const s3 = this.serviceLocator.get('s3')
  //   if (attachment) {
  //     res.header('Content-disposition', `attachment; filename=${filename}`)
  //   }
  //   res.header('Content-Type', mime.lookup(filename))
  //   const stream = s3
  //     .getObject({
  //       Bucket: process.env.AWS_BUCKET,
  //       Key: file_path,
  //     })
  //     .createReadStream()
  //   stream.on('error', () => {
  //     res.writeHead(404)
  //     res.end()
  //   })
  //   stream.pipe(res)
  // }

  @Post('/upload')
  async uploadFile({ params, files }: Request) {
    const { file } = files
    const { entity, entity_id, property } = params
    const file_path = await this.Model.file.moveUploadedFile(file as File, path.join(entity, property, uuid()))
    if (entity && entity_id) {
      const record = await this.DB.find<{ [key in string]: string }>(entity, entity_id)
      if (record) {
        record[property] && (await this.Model.file.removeOldFile(record[property]))
        await this.DB.updateById(entity, { id: entity_id, [`${property}_url`]: file_path })
      }
    }
    return {
      file_path,
    }
  }
}
