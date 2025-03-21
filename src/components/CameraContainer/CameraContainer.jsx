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
          
          <div className="mask"></div>
          <canvas
            id='overlay'  
          />
          <div className='circle-focus'>

          </div>
        </div>

  )
}

export default CameraContainer