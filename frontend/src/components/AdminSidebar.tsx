import { HomeIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline'  
import {  UserButton  } from '@clerk/nextjs'
import Link from 'next/link'

export default function AdminSidebar({ user }: { user: any }) {
  
  return (
     <aside className="w-64 bg-white text-white flex flex-col border-r border-[#e2e8f0]">
      <div className="py-4 flex justify-center border-b border-[#e2e8f0]">
        <img src="/assets/sidebar-logo.png" alt="Logo Comedor Admin" className='w-32 pt-4'  />
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/admin" className="flex items-center text-[#64748b] text-xl px-3 py-2 rounded hover:bg-gray-100 hover:text-black">
          <HomeIcon className="h-5 w-5 mr-2"  /> Dashboard
        </Link>
        <Link href="/admin/history" className="flex text-xl text-[#64748b] items-center px-3 py-2 rounded hover:bg-gray-100 hover:text-black">
          <ClockIcon className="h-5 w-5 mr-2" /> Historial
        </Link>
        <Link href="/admin/reports" className="flex text-xl text-[#64748b] items-center px-3 py-2 rounded hover:bg-gray-100 hover:text-black">
          <ChartBarIcon className="h-5 w-5 mr-2" /> Reportes
        </Link>
      </nav>
      <div className="p-4 border-t border-[#e2e8f0]">


            <div className="flex  p-4 text-[#64748b] space-x-5 items-center">
      <UserButton  />
            <span className='text-xl'>{user?.username}</span>

          </div>


      </div>
    </aside>
  )
}
