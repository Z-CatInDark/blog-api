import { getValue } from '@/config/RedisConfig'
import config from '../config/index'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

const getJWTPayload = token => {
  return jwt.verify(token.split(' ')[1], config.JWT_SECRET)
}

const checkCode = async (key, value) => {
  const redisData = await getValue(key)
  if (redisData !== null && redisData !== 'undefined') {
    if (redisData.toLowerCase() === value.toLowerCase()) {
      return true
    } else {
      return false
    }
  } else {
    return false
  }
}

// const checkToken = async (key, value) => {
//   const redisData = await getValue(key)
//   if (redisData !== null && redisData !== 'undefined') {
//     if (redisData === value) {
//       return true
//     } else {
//       return false
//     }
//   } else {
//     return false
//   }
// }

const getStats = (path) => {
  return new Promise((resolve) => {
    fs.stat(path, (err, stats) => err ? resolve(false) : resolve(stats))
  })
}

const mkdir = (dir) => {
  return new Promise((resolve) => {
    fs.mkdir(dir, err => err ? resolve(false) : resolve(true))
  })
}

const dirExists = async (dir) => {
  const isExists = await getStats(dir)
  // 判断该路径是否存在
  if (isExists && isExists.isDirectory()) {
    // 存在且不是文件
    return true
  } else if (isExists) {
    // 存在但是是文件
    return false
  }
  // 路径不存在，创建新的路径
  const tempDir = path.parse(dir).dir
  // 递归判断上级目录是否存在
  const status = await dirExists(tempDir)
  if (status) {
    const result = await mkdir(dir)
    return result
  } else {
    return false
  }
}

const rename = (obj, key, newKey) => {
  if (Object.keys(obj).indexOf(key) !== -1) {
    obj[newKey] = obj[key]
    delete obj[key]
  }
  return obj
}

export {
  checkCode,
  // checkToken,
  getJWTPayload,
  dirExists,
  rename
}
