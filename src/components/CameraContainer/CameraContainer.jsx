import React from 'react'
import './CameraContainer.css'

const CameraContainer = () => {
  return (
        <div className='camera-container'>
          <video
            autoPlay
            playsInline
            muted
            id="video"
            className="camera"
          ></video>
          <canvas
            id='overlay'  
          />
        </div>

  )
}

export default CameraContainer