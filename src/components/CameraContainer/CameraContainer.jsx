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
        </div>

  )
}

export default CameraContainer