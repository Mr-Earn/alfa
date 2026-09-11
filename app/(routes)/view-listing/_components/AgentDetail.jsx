import { Button } from '@/components/ui/button'
import Image from 'next/image'
import React, { useState } from 'react'
import MessageModal from './MessageModal'

function AgentDetail({listingDetail}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const ownerEmail = listingDetail?.createdBy ?? listingDetail?.createdby
  const ownerName = listingDetail?.fullName

  return (
    <>
      <div className='flex gap-5 items-center justify-between 
      p-5 rounded-lg shadow-md border my-6'>
          <div className='flex items-center gap-6'>
              <Image src={listingDetail?.profileImage}
              alt='profileImage'
              width={60}
              height={60}
              className='rounded-full'
              />
              <div>
                  <h2 className='text-lg font-bold'>{ownerName}</h2>
                  <h2 className='text-gray-500'>{ownerEmail}</h2>
              </div>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>Send Message</Button>
      </div>

      <MessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ownerEmail={ownerEmail}
        ownerName={ownerName}
        listingTitle={listingDetail?.title || listingDetail?.address}
      />
    </>
  )
}

export default AgentDetail