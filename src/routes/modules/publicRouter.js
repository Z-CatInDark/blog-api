import Router from 'koa-router'
import publicController from '@/api/PublicController'
import contentController from '@/api/ContentController'
import userController from '@/api/UserController'
import commentsController from '@/api/CommentsController'

const router = new Router()

router.prefix('/public')
// 获取验证码
router.get('/getCaptcha', publicController.getCaptcha)

// 获取文章列表
router.get('/lists', contentController.getPostLists)

// 获取置顶列表
router.get('/top', contentController.getTop)

// 获取友情链接
router.get('/tips', contentController.getTips)

// 获取温馨通道
router.get('/links', contentController.getLinks)

// 获取本周热议
router.get('/topWeek', contentController.getTopWeek)

// 确认修改邮箱
router.get('/reset-email', userController.updateUsername)

// 获取文章详情
router.get('/content/detail', contentController.getPostDetail)

// 获取评论列表
router.get('/comments', commentsController.getComments)

// 获取用户基本资料
router.get('/info', userController.getUserInfo)

// 获取用户最近发帖纪录
router.get('/latest-post', contentController.getPostPublic)

// 获取用户最近评论纪录
router.get('/latest-comments', commentsController.getCommentsPublic)

// 验证token是否过期
router.get('/validate-token', userController.validateToken)

export default router
