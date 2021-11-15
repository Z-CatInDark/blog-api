import svgCaptcha from 'svg-captcha'
import { setValue } from '@/config/RedisConfig'

class PublicController {
  async getCaptcha (ctx) {
    const body = ctx.request.query
    const newCaptcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1il',
      color: true,
      noise: Math.floor(Math.random() * 5),
      width: 150,
      height: 38
    })
    // 保存图片验证码数据，设置超时时间，单位: s
    // 设置图片验证码超时10分钟
    await setValue(body.sid, newCaptcha.text, 10 * 60)
    ctx.body = {
      code: 200,
      data: newCaptcha.data
    }
  }
}

export default new PublicController()
