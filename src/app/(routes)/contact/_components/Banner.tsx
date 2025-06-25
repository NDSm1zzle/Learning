import React from 'react'

// Banner functional component
// This component serves as a promotional section for the LevelUp Budget application
function Banner() { // Removed verbose comment
    return (
        <section className="flex items-center flex-col">
            
  <div className="mx-auto max-w-screen-xl px-4 py-32 lg:flex lg:h-screen lg:items-center">
      
    <div className="mx-auto max-w-xl text-center">
          
      <h1 className="text-3xl font-extrabold sm:text-5xl">
      Contact Us
      </h1>
        
      <p className="mt-4 sm:text-xl/relaxed">
        Have questions, feedback, or just want to say hi? We're here to help! Reach out to us anytime at <a className="text-blue-500"href="mailto:levelupbudgethelp@gmail.com">levelupbudgethelp@gmail.com</a>
      </p>
    </div>
  </div>
</section>
    )
}
export default Banner
