import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { isProductionEnv } from '@/lib/env'
import { provisionUser } from '@/lib/userProvisioning'

// 測試帳號憑證（只在「DEMO_ENABLED=true 且非正式環境」時啟用）。
// 雙重條件是刻意的：正式站本該靠「不設 DEMO_ENABLED」關閉入口，但那是純部署設定，
// Vercel 環境變數的 scope 一旦誤設成 All Environments，正式站就會開出一個
// 密碼公開於原始碼的登入口。加上 isProductionEnv() 後，即使設定失手也不會生效。
const DEMO_EMAIL = 'demo@drpet.com'
const DEMO_PASSWORD = 'demo1234'
const DEMO_USER_ID = 'demo-user'

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(process.env.DEMO_ENABLED === 'true' && !isProductionEnv()
      ? [
          Credentials({
            name: 'Demo Account',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
              if (
                credentials?.email === DEMO_EMAIL &&
                credentials?.password === DEMO_PASSWORD
              ) {
                return {
                  id: DEMO_USER_ID,
                  name: '示範飼主',
                  email: DEMO_EMAIL,
                  image: null,
                }
              }
              return null
            },
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    // 只有「登入當下」這一次會帶 user；之後每次請求都是既有 token，不會再打資料庫。
    async jwt({ token, user, account, profile }) {
      if (!user?.id) return token

      // JWT strategy 不會替我們建立 User 這一列（那是 database strategy + adapter 才做的事），
      // 但 Pet.userId / PetMember.userId / PushSubscription.userId 都是指向 User 的外鍵。
      // 少了這一步，使用者一按「新增毛孩」就會撞 P2003。詳見 lib/userProvisioning.ts。
      const result = await provisionUser({
        providerUserId: user.id,
        email: user.email,
        // Google 認 email_verified；demo 帳號的 email 由本專案自己寫死，視同已驗證。
        emailVerified:
          account?.provider === 'google' ? profile?.email_verified === true : true,
        name: user.name,
        image: user.image,
      })

      if (!result.ok) {
        // 失敗就不要發 session。帶著一個沒有對應 User 的 id 進 App，
        // 每一支寫入 API 都會 500，比乾脆登入失敗更難查。回傳 null 會清掉 session cookie。
        console.error('[auth] 無法備妥使用者資料，拒發 session:', result.error)
        return null
      }

      token.id = result.userId
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
})
