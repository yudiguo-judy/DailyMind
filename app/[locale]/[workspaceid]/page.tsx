"use client"

import { ChatbotUIContext } from "@/context/context"
import { useContext, useEffect } from "react"
import { getChatsByDateRange } from "@/db/chats"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"

export default function WorkspacePage() {
  const { selectedWorkspace, selectedChat, setSelectedChat } =
    useContext(ChatbotUIContext)
  const router = useRouter()

  useEffect(() => {
    const fetchChats = async () => {
      if (!selectedWorkspace) return

      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      if (!selectedChat) {
        const chats = await getChatsByDateRange(user.id)

        if (chats && chats.length > 0) {
          setSelectedChat(chats[0])
          router.push(`/${selectedWorkspace.id}/chat/${chats[0].id}`)
        }
      }
    }

    fetchChats()
  }, [selectedWorkspace, selectedChat])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="text-4xl">{selectedWorkspace?.name}</div>
    </div>
  )
}
