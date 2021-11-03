import Comments from '../model/Comments'
import { checkCode, getJWTPayload } from '@/common/Utils'
import Post from '../model/Post'
import User from '../model/User'
import CommentsHands from '../model/CommentsHands'

const canReply = async (ctx) => {
  let result = false
  const obj = await getJWTPayload(ctx.header.authorization)
  if (typeof obj._id === 'undefined') {
    return result
  } else {
    const user = await User.findByID(obj._id)
    if (user.status === '0') {
      result = true
    }
    return result
  }
}

class CommentsController {
  // 查询评论列表
  async getComments (ctx) {
    const params = ctx.query
    const tid = params.tid
    const page = params.page ? params.page : 0
    const limit = params.limit ? parseInt(params.limit) : 0
    let result = await Comments.getCommentsList(tid, page, limit)
    // 判断用户是否登录，已登录用户才去判断是否点赞
    let obj = {}
    if (typeof ctx.header.authorization !== 'undefined') {
      obj = await getJWTPayload(ctx.header.authorization)
    }
    if (typeof obj._id !== 'undefined') {
      result = result.map(item => item.toJSON())
      for (let i = 0; i < result.length; i++) {
        const item = result[i]
        item.handed = 0
        const commentsHands = await CommentsHands.findOne({ cid: item._id, uid: obj._id })
        if (commentsHands && commentsHands.cid) {
          if (commentsHands.uid === obj._id) {
            item.handed = 1
          }
        }
      }
    }
    const total = await Comments.queryCount(tid)
    ctx.body = {
      code: 200,
      total,
      data: result,
      msg: '查询成功'
    }
  }

  async getCommentsPublic (ctx) {
    const params = ctx.query
    const result = await Comments.getCommentsPublic(params.uid, params.page, parseInt(params.limit))
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        msg: '查询评论纪录成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询列表失败'
      }
    }
  }

  // 添加评论
  async addComment (ctx) {
    const check = await canReply(ctx)
    if (!check) {
      ctx.body = {
        code: 500,
        msg: '用户已被禁言'
      }
    }
    const { body } = ctx.request
    const sid = body.sid
    const vercode = body.vercode
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, vercode)
    if (!result) {
      ctx.body = {
        code: 500,
        msg: '图片验证码不正确，请检查'
      }
    }
    const newComment = new Comments(body)
    const obj = await getJWTPayload(ctx.header.authorization)
    newComment.cuid = obj._id
    const comment = await newComment.save()
    const updatePostResult = await Post.updateOne({ _id: body.tid }, { $inc: { answer: 1 } })
    if (comment._id && updatePostResult.ok === 1) {
      ctx.body = {
        code: 200,
        data: comment,
        msg: '评论成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '评论失败'
      }
    }
  }

  async updateComment (ctx) {
    const check = await canReply(ctx)
    if (!check) {
      ctx.body = {
        code: 500,
        msg: '用户已被禁言'
      }
    }
    const { body } = ctx.request
    const result = await Comments.updateOne({ _id: body.cid }, { $set: body })
    ctx.body = {
      code: 200,
      msg: '修改成功',
      data: result
    }
  }

  // 设置最佳答案
  async setBest (ctx) {
    const obj = await getJWTPayload(ctx.header.authorization)
    if (typeof obj === 'undefined' && obj.id !== '') {
      ctx.body = {
        code: '401',
        msg: '用户未登录,或者用户未授权'
      }
    }
    const params = ctx.query
    const post = await Post.findOne({ _id: params.tid })
    // 判断是否是作者本人
    if (post.uid === obj._id && post.isEnd === '0') {
      const result1 = await Post.updateOne({ _id: params.tid }, {
        $set: {
          isEnd: '1'
        }
      })
      const result2 = await Comments.updateOne({ _id: params.cid }, { $set: { isBest: '1' } })
      // 判断是否设置成功
      if (result1.ok === 1 && result2.ok === 1) {
        // 将文章悬赏的积分值给被采纳的用户
        const comment = await Comments.findByCid(params.cid)
        const result3 = await User.updateOne({ _id: comment.cuid }, { $inc: { favs: parseInt(post.fav) } })
        if (result3.ok === 1) {
          ctx.body = {
            code: 200,
            msg: '设置成功',
            data: result3
          }
        } else {
          ctx.body = {
            code: 500,
            msg: '设置最佳答案-更新用户积分失败'
          }
        }
      } else {
        ctx.body = {
          code: 500,
          msg: '设置失败',
          data: { ...result1, ...result2 }
        }
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '帖子已结贴, 无法重复设置'
      }
    }
  }

  // 评论点赞
  async setHands (ctx) {
    const obj = await getJWTPayload(ctx.header.authorization)
    const params = ctx.query
    // const tmp = await CommentsHands.find({ cid: params.cid, uid: obj._id })
    if (parseInt(params.handed)) {
      const result1 = await Comments.updateOne({ _id: params.cid }, { $inc: { hands: -1 } })
      const result2 = await CommentsHands.deleteOne({ cid: params.cid, uid: obj._id })
      if (result1.ok === 1 && result2.ok === 1) {
        ctx.body = {
          code: 205,
          msg: '取消点赞'
        }
      }
    } else {
      // 新增一条点赞记录
      const newHands = new CommentsHands({
        cid: params.cid,
        uid: obj._id
      })
      const data = await newHands.save()
      const result = await Comments.updateOne({ _id: params.cid }, { $inc: { hands: 1 } })
      if (result.ok === 1) {
        ctx.body = {
          code: 200,
          msg: '点赞成功',
          data: data
        }
      }
    }
  }
}

export default new CommentsController()
