import React from 'react'
import './CameraContainer.css'

const CameraContainer = ({onPlay}) => {
  return (
        <div className='camera-container'>
          <video
            autoPlay
            playsInline
            muted
            id="video"
            className="camera"
            onLoadedMetadata={() => onPlay(this)}
          ></video>
          <canvas
            id='overlay'  
          />
        </div>

  )
}

export default CameraContainer