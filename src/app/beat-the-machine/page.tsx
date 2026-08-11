'use client'

import dynamic from 'next/dynamic'

const BeatTheMachine = dynamic(() => import('@/components/BeatTheMachine'), { ssr: false })

export default function BeatTheMachinePage() {
  return <BeatTheMachine />
}
