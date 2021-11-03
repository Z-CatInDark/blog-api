import mongoose from '@/config/DBHelpler'
import moment from 'dayjs'

const Schema = mongoose.Schema

const CommentsSchema = new Schema({
  cid: { type: String },
  uid: { type: String },
  created: { type: Date, default: () => moment(new Date()).format('YYYY-MM-DD HH:mm:ss') }
})

CommentsSchema.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})
CommentsSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Error: MongoError has a duplicate key.'))
  } else {
    next(error)
  }
})
CommentsSchema.statics = {
  findByTid: function (id) {
    return this.findByTid({ tid: id })
  },
  findByCid: function (id) {
    return this.findByTid({ cid: id })
  }
}
const Comments = mongoose.model('Comments_hands', CommentsSchema)

export default Comments
