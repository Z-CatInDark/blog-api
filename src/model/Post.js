import mongoose from '@/config/DBHelpler'
import moment from 'dayjs'

const Schema = mongoose.Schema

const PostSchema = new Schema({
  uid: { type: String, ref: 'users' },
  title: { type: String },
  content: { type: String },
  created: { type: String, default: () => moment(new Date()).format('YYYY-MM-DD HH:mm:ss') },
  catalog: { type: String },
  fav: { type: String },
  isEnd: { type: String, default: '0' },
  reads: { type: Number, default: 0 },
  answer: { type: Number, default: 0 },
  status: { type: String, default: '0' },
  isTop: { type: String, default: '0' },
  sort: { type: String, default: '100' },
  tags: {
    type: Array
  }
})
PostSchema.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})
PostSchema.statics = {
  /**
   *
   * @param {*} options  筛选条件
   * @param {*} sort 排序方式
   * @param {*} page 分页页数
   * @param {*} limit 分页条数
   * @returns
   */
  getList: function (options, sort, page, limit) {
    return this.find(options)
      .sort({ [sort]: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate({
        path: 'uid',
        select: 'name isVip pic'
      })
  },
  // 查询本周热议
  getTopWeek: function () {
    return this.find({
      created: {
        // 筛选前7天的数据
        $gte: moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss')
      }
    }
    , {
      answer: 1,
      title: 1
    })
      .sort({
        answer: -1
      })
      .limit(15)
  },
  findByTid: function (id) {
    return this.findOne({ _id: id }).populate({
      path: 'uid',
      select: 'name pic isVip _id'
    })
  },
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
const PostModel = mongoose.model('post', PostSchema)

export default PostModel
