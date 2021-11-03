import mongoose from '@/config/DBHelpler'
import moment from 'dayjs'

const Schema = mongoose.Schema

const UserSchema = new Schema({
  // 有username时进行检索，无则略过
  username: { type: String, index: { unique: true }, sparse: true },
  password: { type: String },
  name: { type: String },
  created: { type: String, default: () => moment(new Date()).format('YYYY-MM-DD HH:mm:ss') },
  updated: { type: Date },
  favs: { type: Number, default: 100 },
  gender: { type: String, default: '' },
  roles: { type: Array, default: 'user' },
  pic: { type: String },
  mobile: { type: String, match: /^1[3-9](\d{9})$/, default: '' },
  status: { type: String, default: '0' },
  regmark: { type: String, default: '' },
  location: { type: String, default: '' },
  isVip: { type: String, default: '0' },
  count: { type: Number, default: 0 }
})
UserSchema.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})

UserSchema.pre('update', function (next) {
  this.update = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})

// 处理用户邮箱重复
UserSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Error: MongoError has a duplicate key.'))
  } else {
    next(error)
  }
})

// 处理用户敏感数据
UserSchema.statics = {
  findByID: function (id) {
    return this.findOne({ _id: id }, {
      password: 0,
      username: 0,
      mobile: 0
    })
  }
}
const UserModel = mongoose.model('users', UserSchema)

export default UserModel
