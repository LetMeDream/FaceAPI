import React from 'react'
import './CameraContainer.css'
import styled from 'styled-components';

const StyledCircleFocus = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isValid', // Filtra la prop isValid
})`
  height: 80%; /* 80% del padre de 480px; 384px */
  aspect-ratio: 1 / 1;
  border: 1px solid ${({ isValid }) => (isValid ? 'green' : 'red')}; /* Cambia el color según isValid */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 100%;
`;

const CameraContainer = ({
  onPlay,
  isValid
}) => {

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
          <StyledCircleFocus 
            className='circle-focus' 
            isValid={isValid}
          />
        </div>

  )
}

export default CameraContainer