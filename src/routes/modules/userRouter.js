import Router from 'koa-router'
import userController from '@/api/UserController'
import contentController from '@/api/ContentController'

const router = new Router()

router.prefix('/user')

// 用户签到
router.get('/fav', userController.userSign)

// 更新用户的基本信息
router.post('/basic', userController.updateUserInfo)

// 修改密码
router.post('/change-password', userController.changePassword)

// 收藏帖子
router.get('/add-collect', userController.addCollect)

// 获取收藏列表
router.get('/get-collect', userController.getCollect)

// 删除收藏记录
router.get('/delete-collect', userController.deleteCollect)

// 获取发帖纪录
router.get('/get-post', contentController.getPostList)

// 删除帖子
router.get('/delete-post', contentController.deletePost)

export default router
