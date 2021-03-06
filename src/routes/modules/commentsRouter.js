import Router from 'koa-router'
import commentsController from '@/api/CommentsController'

const router = new Router()

router.prefix('/comments')

// 发表评论
router.post('/reply', commentsController.addComment)
// 更新评论
router.post('/update-post', commentsController.updateComment)
// 设置最佳答案
router.get('/accept', commentsController.setBest)
// 评论点赞
router.get('/hands', commentsController.setHands)

export default router
