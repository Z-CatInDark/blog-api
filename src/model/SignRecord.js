import mongoose from 'mongoose'
import moment from 'dayjs'

const Schema = mongoose.Schema

const SignRecordSchema = new Schema({
  uid: { type: String, ref: 'users' },
  created: { type: String, default: () => moment(new Date()).format('YYYY-MM-DD HH:mm:ss') },
  favs: { type: Number }
})

SignRecordSchema.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})
// 利用倒序查找用户上次签到时间
SignRecordSchema.statics = {
  findByUid: function (uid) {
    return this.findOne({ uid: uid }).sort({ created: -1 })
  }
}
const SignRecord = mongoose.model('sign_record', SignRecordSchema)

export default SignRecord
