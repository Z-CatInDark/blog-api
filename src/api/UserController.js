import { getJWTPayload } from '../common/Utils'
import User from '../model/User'
import SignRecord from '@/model/SignRecord'
import UserCollect from '@/model/UserCollect'
import send from '@/config/MailConfig'
import moment from 'dayjs'
import uuid from 'uuid/v4'
import jwt from 'jsonwebtoken'
import config from '@/config/index.js'
import { setValue, getValue } from '@/config/RedisConfig'
import { checkCode } from '@/common/Utils'
import bcrypt from 'bcryptjs'

class UserController {
  // 用户签到接口
  async userSign (ctx) {
    // 获取用户ID
    const obj = await getJWTPayload(ctx.header.authorization)
    // 获取用户上次签到时间
    const record = await SignRecord.findByUid(obj._id)
    // 查询用户账号信息
    const user = await User.findByID(obj._id)
    let newRecord = {}
    let result = ''
    // 判断是否有历史签到数据
    if (record !== null) {
      /*
        有历史签到信息
        - 判断用户上一次签到记录的时间是否与今天相同
        - 相同代表用户是在连续签到，状态为已签到
      */
      if (moment(record.created).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')) {
        ctx.body = {
          code: 500,
          msg: '用户已经签到',
          favs: user.favs,
          count: user.count,
          lastSign: record.created
        }
        return
      } else {
        // 有上一次签到记录，但是不与今天相同
        // 判断是否是连续签到
        let fav = 0
        let count = user.count
        if (moment(record.created).format('YYYY-MM-DD') === moment().subtract(1, 'days').format('YYYY-MM-DD')) {
          // 连续签到的积分逻辑
          count += 1
          if (count < 5) {
            fav = 5
          } else if (count >= 5 && count < 15) {
            fav = 10
          } else if (count >= 15 && count < 30) {
            fav = 15
          } else if (count >= 30 && count < 100) {
            fav = 20
          } else if (count >= 100 && count < 365) {
            fav = 30
          } else if (count >= 365) {
            fav = 50
          }
          await User.updateOne(
            { _id: obj._id },
            {
              $inc: { favs: fav, count: 1 }
            }
          )
          result = {
            favs: user.favs + fav,
            count: user.count + 1
          }
        } else {
          // 用户中断签到，重新计算连续签到天数
          fav = 5
          await User.updateOne(
            { _id: obj._id },
            {
              $set: { count: 1 },
              $inc: { favs: fav }
            }
          )
          result = {
            favs: user.favs + fav,
            count: 1
          }
        }
        newRecord = new SignRecord({
          uid: obj._id,
          favs: fav
        })
        await newRecord.save()
      }
    } else {
      // 无历史签到数据，保存用户签到数据：积分 + 次数
      await User.updateOne({
        _id: obj._id
      },
      {
        $set: { count: 1 },
        $inc: { favs: 5 }
      })
      // 保存用户签到记录
      newRecord = new SignRecord({
        uid: obj._id,
        favs: 5
      })
      await newRecord.save()
      result = {
        favs: user.favs + 5,
        count: 1
      }
    }

    ctx.body = {
      code: 200,
      msg: '请求成功',
      ...result,
      lastSign: newRecord.created
    }
  }

  // 更新用户资料
  async updateUserInfo (ctx) {
    const { body } = ctx.request
    const obj = await getJWTPayload(ctx.header.authorization)
    const user = await User.findOne({ _id: obj._id })
    let msg = ''
    if (body.username && body.username !== user.username) {
      const tmpUser = await User.findOne({ username: body.username })
      if (tmpUser && tmpUser.password) {
        ctx.body = {
          code: 501,
          msg: '邮箱已经注册'
        }
        return
      }
      const key = uuid()
      setValue(key, jwt.sign({ _id: obj._id }, config.JWT_SECRET, {
        expiresIn: '30M'
      }))
      await send({
        type: 'email',
        code: '',
        data: {
          key: key,
          username: body.username
        },
        expire: moment()
          .add(30, 'minutes')
          .format('YYYY-MM-DD HH:mm:ss'),
        email: user.username,
        user: user.name
      })

      msg = '请查收邮件，确认修改账号！ '
    }
    const arr = ['username', 'mobile', 'password']
    // 删除用户敏感信息
    // eslint-disable-next-line array-callback-return
    arr.map((item) => {
      delete body[item]
    })
    const result = await User.updateOne({ _id: obj._id }, body)
    if (result.n === 1 && result.ok === 1) {
      ctx.body = {
        code: 200,
        msg: msg === '' ? '更新成功' : msg
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '更新失败'
      }
    }
  }

  // 确认修改邮箱资料
  async updateUsername (ctx) {
    const body = ctx.query
    if (body.key) {
      const token = await getValue(body.key)
      const obj = getJWTPayload('Bearer ' + token)
      await User.updateOne({ _id: obj._id }, {
        username: body.username
      })
      ctx.body = {
        code: 200,
        msg: '更新用户名成功'
      }
    }
  }

  // 重置密码
  async resetPassword (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const vercode = body.vercode
    const result = await checkCode(sid, vercode)
    if (result) {
      if (body.key) {
        const token = await getValue(body.key)
        const obj = getJWTPayload('Bearer ' + token)

        const password = await bcrypt.hash(body.password, 5)
        await User.updateOne(
          { _id: obj._id },
          { $set: { password: password } }
        )
        ctx.body = {
          code: 200,
          msg: '重置密码成功'
        }
      }
    }
  }

  // 修改密码
  async changePassword (ctx) {
    const { body } = ctx.request
    const obj = await getJWTPayload(ctx.header.authorization)
    const user = await User.findOne({ _id: obj._id })
    if (await bcrypt.compare(body.nowpassword, user.password)) {
      const newpasswd = await bcrypt.hash(body.password, 5)
      await User.updateOne(
        { _id: obj._id },
        { $set: { password: newpasswd } }
      )
      ctx.body = {
        code: 200,
        msg: '更新密码成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '更新密码错误，请检查！'
      }
    }
  }

  async addCollect (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    if (parseInt(params.isFav)) {
      await UserCollect.deleteOne({ uid: obj._id, tid: params.tid })
      ctx.body = {
        code: 200,
        mgs: '取消收藏成功'
      }
    } else {
      const newCollect = new UserCollect({
        uid: obj._id,
        tid: params.tid,
        title: params.title
      })
      const result = await newCollect.save()
      if (result.uid) {
        ctx.body = {
          code: 200,
          data: result,
          msg: '收藏成功'
        }
      }
    }
  }

  async getCollect (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    const result = await UserCollect.getListByUid(obj._id, params.page, params.limit ? parseInt(params.limit) : 10)
    const total = await UserCollect.countByUid(obj._id)
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

  // 删除收藏记录
  async deleteCollect (ctx) {
    const params = ctx.query
    const obj = await getJWTPayload(ctx.header.authorization)
    const Collect = await UserCollect.findOne({ uid: obj, _id: params.tid })
    if (Collect.id === params.tid) {
      const result = await UserCollect.deleteOne({ _id: params.tid })
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

  // 获取用户资料，同步签到数据
  async getUserInfo (ctx) {
    const params = ctx.query
    const uid = params.uid
    let user = await User.findByID(uid)
    user = user.toJSON()
    const date = moment().format('YYYY-MM-DD')
    const result = await SignRecord.findOne({ uid: uid, created: { $gte: date + ' 00:00:00' } })
    if (result && result.uid) {
      user.isSign = true
    } else {
      user.isSign = false
    }
    ctx.body = {
      code: 200,
      data: user,
      msg: '查询成功'
    }
  }
}

export default new UserController()
