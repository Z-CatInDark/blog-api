import mongoose from '@/config/DBHelpler'
import moment from 'dayjs'

const Schema = mongoose.Schema

const UserCollectSchema = new Schema({
  uid: { type: String },
  tid: { type: String },
  title: { type: String },
  created: { type: Date, default: () => moment(new Date()).format('YYYY-MM-DD HH:mm:ss') }

})

UserCollectSchema.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})

UserCollectSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Error: MongoError has a duplicate key.'))
  } else {
    next(error)
  }
})

UserCollectSchema.statics = {
  getListByUid: function (id, page, limit) {
    return this.find({ uid: id })
      .skip(page * limit)
      .limit(limit)
      .sort({ created: -1 })
  },
  countByUid: function (id) {
    return this.find({ uid: id }).countDocuments()
  }
}
const UserCollect = mongoose.model('user_collect', UserCollectSchema)

export default UserCollect
