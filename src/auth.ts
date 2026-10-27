import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security';
import { credentialsSchema } from '@/lib/validation';
import { compare } from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: '/perfil' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  providers: [
    Credentials({
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        await rateLimit('login', email, 10);
        await rateLimit('login-global', 'all', 150);
        const user = await db.user.findUnique({ where: { email } });
        // A valid dummy bcrypt hash makes missing-account attempts perform comparable work.
        const valid = await compare(
          password,
          user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
        );
        if (!user || !valid) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const session = await db.session.create({
          data: { userId: user.id, expires: new Date(Date.now() + 7 * 86400000) },
        });
        token.sid = session.id;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      const row =
        typeof token.sid === 'string'
          ? await db.session.findUnique({
              where: { id: token.sid },
              include: { user: { select: { name: true, email: true } } },
            })
          : null;
      if (row && row.expires > new Date() && session.user) {
        session.user.id = row.userId;
        session.user.name = row.user.name;
        session.user.email = row.user.email;
      } else {
        session.user.id = '';
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && typeof message.token?.sid === 'string')
        await db.session.deleteMany({ where: { id: message.token.sid } });
    },
  },
});
