import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

// 測試帳號憑證（只在 DEMO_ENABLED=true 時啟用）
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
    ...(process.env.DEMO_ENABLED === 'true'
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
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
})
