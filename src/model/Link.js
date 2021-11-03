import mongoose from '@/config/DBHelpler'
import moment from 'dayjs'

const Schema = mongoose.Schema

const LinksSchema = new Schema({
  title: { type: String, default: '' },
  link: { type: String, default: '' },
  isTop: { type: String, default: '' },
  sort: { type: String, default: '' },
  type: { type: String, default: 'link' },
  created: { type: String, default: () => moment(new Date()).format('YYYY-MM-DD HH:mm:ss') }
})

LinksSchema.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})
const LinksModel = mongoose.model('links', LinksSchema)

export default LinksModel
