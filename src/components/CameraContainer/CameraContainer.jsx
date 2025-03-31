import React from 'react'
import './CameraContainer.css'
import styled from 'styled-components';

const StyledCircleFocus = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isValid', // Filtra la prop isValid
})`
  height: var(--circle-focus-height); /* 80% del padre de 480px; 384px */
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
  const [maskImageRadius, setMaskImageRadius] = React.useState(null);

  /* Automatically calculates --mask-image-radius */
  React.useEffect(() => {
    const calculateMaskImageRadius = () => {
      const container = document.querySelector('.camera-container');
      const styles = getComputedStyle(container);

      const mainHeight = parseFloat(styles.getPropertyValue('--main-height')); // px
      const circleFocusHeight = parseFloat(styles.getPropertyValue('--circle-focus-height')); // % 
      const radius = (mainHeight * (circleFocusHeight/100))/2;
      setMaskImageRadius(radius);
    };

    calculateMaskImageRadius();
  }, []);

  return (
        <div className='camera-container'
          style={{
            '--mask-image-radius': maskImageRadius ? `${maskImageRadius}px` : undefined,
          }}
        >
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