import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ClerkProvider } from '@clerk/nextjs'
import Sidebar from '@/components/AdminSidebar'
import { esES } from '@clerk/localizations'
import '../globals.css'

export const metadata = {
  title: 'Panel Admin'
}

export default async function AdminLayout({
  children,
  pageProps
}: {
  children: React.ReactNode
  pageProps: any
}) {
  
  const { userId } = await auth()
  if (!userId) redirect('/login')
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return (
    <ClerkProvider {...pageProps} localization={esES}>
      <div className="flex h-screen">
        <Sidebar user={user} />
        <div className="flex-1 overflow-auto bg-[#f9fbfd]">
          {children}
        </div>
      </div>
    </ClerkProvider>
  )
}