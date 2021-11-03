import path from 'path'

const DB_URL = 'mongodb://test2:123456@8.135.32.181:27017/testdb1'
const REDIS = {
  host: '8.135.32.181',
  port: 15001,
  password: '123456'
}
const JWT_SECRET = 'a&*38QthAKuiRwISGLotgq^3%^$zvA3A6Hfr8MF$jM*HY4*dWcwAW&9NGp7*b53!'

const BaseUrl = process.env.NODE_ENV === 'production' ? '8.135.32.181:8081' : 'http://localhost:8080'

const uploadPath = process.env.NODE_ENV === 'production' ? '/blog-api/public' : path.join(path.resolve(__dirname, '../../public'))
export default {
  DB_URL,
  REDIS,
  JWT_SECRET,
  BaseUrl,
  uploadPath
}
