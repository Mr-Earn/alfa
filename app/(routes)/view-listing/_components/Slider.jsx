import React from 'react'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/carousel"
import Image from 'next/image'
  
function Slider({imageList}) {
    const images = (imageList || []).filter((item) => item?.url)
  return (
    <div >
      {images.length ?      
          <Carousel>
        <CarouselContent>
      {images.map((item,index)=>(
        <CarouselItem key={item.id || item.url || index}>
                    <Image src={item.url} width={800}
                    height={300}
                    alt='image'
                    className='rounded-xl object-cover h-[360px] w-full'
                    />
                 </CarouselItem>
            ))}
           
           
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
        </Carousel>
        :<div className='flex h-[200px] w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500'>
          No listing photos available.
        </div>}

    </div>
  )
}

export default Slider