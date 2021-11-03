import Post from '@/model/Post'
import Link from '@/model/Link'
import UserCollect from '@/model/UserCollect'
import fs from 'fs'
import uuid from 'uuid/v4'
import moment from 'dayjs'
import config from '@/config'
import { checkCode, getJWTPayload } from '@/common/Utils'
import mkdir from 'make-dir'
import User from '@/model/User'

// 读写大型文件
// import { dirExists } from '@/common/Utils'

class ContentController {
  async getPostLists (ctx) {
    const body = ctx.query
    const sort = body.sort ? body.sort : 'created'
    const page = body.page ? parseInt(body.page) : 0
    const limit = body.limit ? parseInt(body.limit) : 20
    const options = {}
    if (typeof body.catalog !== 'undefined' && body.catalog !== '') {
      options.catalog = body.catalog
    }
    if (typeof body.isTop !== 'undefined') {
      options.isTop = body.isTop
    }
    if (typeof body.status !== 'undefined' && body.status !== '') {
      options.status = body.status
    }
    if (typeof body.isEnd !== 'undefined' && body.isEnd !== '') {
      options.isEnd = body.isEnd
    }
    if (typeof body.tags !== 'undefined' && body.tags !== '') {
      options.tags = { $elemMatch: { name: body.tags } }
    }
    const result = await Post.getList(options, sort, page, limit)
    ctx.body = {
      code: 200,
      data: result,
      msg: '获取文章列表成功'
    }
  }

  // 获取置顶列表
  async getTop (ctx) {
    const body = ctx.query
    const sort = body.sort ? body.sort : 'created'
    const page = body.page ? parseInt(body.page) : 0
    const limit = body.limit ? parseInt(body.limit) : 20
    const options = {}
    if (typeof body.isTop !== 'undefined') {
      options.isTop = body.isTop
    }
    const result = await Post.getList(options, sort, page, limit)
    ctx.body = {
      code: 200,
      data: result,
      msg: '获取文章列表成功'
    }
  }

  // 查询友链
  async getLinks (ctx) {
    const result = await Link.find({ type: 'links' })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 查询温馨通道
  async getTips (ctx) {
    const result = await Link.find({ type: 'tips' })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 查询本周热议
  async getTopWeek (ctx) {
    const result = await Post.getTopWeek()
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 上传图片
  async uploadImg (ctx) {
    const file = ctx.request.files.file
    const ext = file.name.split('.').pop()
    const dir = `${config.uploadPath}/${moment().format('YYYYMMDD')}`
    // await dirExists(dir)
    await mkdir(dir)
    const picname = uuid()
    const destPath = `${dir}/${picname}.${ext}`
    const reader = fs.createReadStream(file.path)
    // 读取打文件时设置读取速度，默认为64kb
    /* const reader = fs.createReadStream(file.path, {
      highWaterMark: 1 * 1024
    }) */
    const upStream = fs.createWriteStream(destPath)
    const filePath = `/${moment().format('YYYYMMDD')}/${picname}.${ext}`
    reader.pipe(upStream)
    ctx.body = {
      code: 200,
      msg: '图片上传成功',
      data: filePath
    }

    // 大型文件读取
    /*     let totalLength = 0
    const stat = fs.statSync(file.path)
    reader.on('data', (chunk) => {
      // 监听文件读取速度
      totalLength += chunk.totalLength
      if (upStream.write(chunk) === false) {
        reader.pause()
      }
    })

    reader.on('drain', () => {
      reader.resume()
    })

    // 读写完成关闭工作流
    reader.on('end', () => {
      upStream.end()
    }) */
  }

  async addPost (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const vercode = body.vercode
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, vercode)
    if (result) {
      const obj = await getJWTPayload(ctx.header.authorization)
      const user = await User.findByID({ _id: obj._id })
      if (user.favs < body.fav) {
        ctx.body = {
          code: 501,
          msg: '积分不足'
        }
        return
      } else {
        await User.updateOne({ _id: obj._id }, { $inc: { favs: -body.fav } })
      }
      const newPost = new Post(body)
      newPost.uid = obj._id
      const result = await newPost.save()
      ctx.body = {
        code: 200,
        msg: '文章上传成功',
        data: result

      }
    } else {
      ctx.body = {
        code: 500,
        msg: '图片验证码验证失败'
      }
    }
  }

  async updatePost (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const vercode = body.vercode
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, vercode)
    if (result) {
      const obj = await getJWTPayload(ctx.header.authorization)
      const post = await Post.findOne({ _id: body.tid })
      // 判断是否是作者本人，且帖子未结贴
      if (post.uid === obj._id && post.isEnd === '0') {
        const result = await Post.updateOne({ _id: body.tid }, body)
        if (result.ok === 1) {
          ctx.body = {
            code: 200,
            data: result,
            msg: '文章更新成功'
          }
        } else {
          ctx.body = {
            code: 500,
            data: result,
            msg: '文章更新失败'
          }
        }
      } else {
        ctx.body = {
          code: 401,
          msg: '权限不足'
        }
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '验证码错误'
      }
    }
  }

  // 获取文章详情
  async getPostDetail (ctx) {
    const params = ctx.query
    if (!params.tid) {
      ctx.body = {
        code: 500,
        msg: '文章标题为空'
      }
      return
    }
    const post = await Post.findByTid(params.tid)

    // 返回文章是否收藏
    let isFav = 0
    if (typeof ctx.header.authorization !== 'undefined') {
      const obj = await getJWTPayload(ctx.header.authorization)
      const userCollect = await UserCollect.findOne({
        uid: obj._id,
        tid: params.tid
      })
      if (userCollect && userCollect.tid) {
        isFav = 1
      }
    }
    const newPost = post.toJSON()
    newPost.isFav = isFav
    const result = await Post.updateOne({ _id: params.tid }, { $inc: { reads: 1 } })
    if (post._id && result.ok === 1) {
      ctx.body = {
        code: 200,
        data: newPost,
        msg: '查询文章详情成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '获取文章详情失败'
      }
    }
  }

  // 获取用户发帖纪录
  async getPostList (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    const result = await Post.getListByUid(obj._id, params.page, params.limit ? parseInt(params.limit) : 10)
    const total = await Post.countByUid(obj._id)
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        total: total,
        msg: '查询列表成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询列表失败'
      }
    }
  }

  // 删除帖子
  async deletePost (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    const post = await Post.findOne({ uid: obj, _id: params.tid })
    if (post.id === params.tid && post.isEnd === '0') {
      const result = await Post.deleteOne({ _id: params.tid })
      if (result.ok === 1) {
        ctx.body = {
          code: 200,
          msg: '删除成功'
        }
      } else {
        ctx.body = {
          code: 500,
          msg: '执行删除失败'
        }
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '删除失败，无权限'
      }
    }
  }

  // 获取用户最近的发帖纪录
  async getPostPublic (ctx) {
    const params = ctx.query
    const result = await Post.getListByUid(params.uid, params.page, params.limit ? parseInt(params.limit) : 10)
    const total = await Post.countByUid(params.uid)
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        total: total,
        msg: '查询列表成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询列表失败'
      }
    }
  }
}
export default new ContentController()
